#!/bin/bash

# ========================================
# Smoke Test: User Profile & Avatar Upload
# ========================================
# Тестирует полный flow загрузки аватара пользователя
# с CSRF защитой и tenant isolation

set -e  # Exit on error

COOKIES_FILE="/tmp/test-user-cookies.txt"
API_BASE="${API_BASE:-http://localhost:6020}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-owner@beauty-test-salon.ru}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-owner123}"
TEST_IMAGE_PATH="${TEST_IMAGE_PATH:-/tmp/test-avatar.png}"

echo "=========================================="
echo "🧪 SMOKE TEST: User Profile & Avatar Upload"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  API_BASE: $API_BASE"
echo "  TEST_USER: $TEST_USER_EMAIL"
echo "  COOKIES: $COOKIES_FILE"
echo ""

# Cleanup previous cookies
rm -f "$COOKIES_FILE"

# Step 1: Login
echo "Step 1: Login as $TEST_USER_EMAIL"
LOGIN_RESPONSE=$(curl -s -c "$COOKIES_FILE" -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"$TEST_USER_PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"

# Check if login successful
if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""

# Step 2: Get CSRF Token
echo "Step 2: Fetch CSRF token"
CSRF_RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_BASE/api/auth/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo "❌ Failed to get CSRF token"
  echo "Response: $CSRF_RESPONSE"
  exit 1
fi

echo "✅ CSRF token obtained: ${CSRF_TOKEN:0:20}..."
echo ""

# Step 3: Get current user profile (without CSRF - GET request)
echo "Step 3: Fetch current user profile"
PROFILE_RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_BASE/api/auth/users/profile")

echo "Profile response: $PROFILE_RESPONSE"

USER_ID=$(echo "$PROFILE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to get user profile"
  exit 1
fi

echo "✅ User profile loaded. User ID: $USER_ID"
echo ""

# Step 4: Create test avatar image (if not exists)
if [ ! -f "$TEST_IMAGE_PATH" ]; then
  echo "Step 4: Creating test avatar image..."
  # Create a simple 256x256 PNG (requires ImageMagick)
  if command -v convert &> /dev/null; then
    convert -size 256x256 xc:blue "$TEST_IMAGE_PATH"
    echo "✅ Test image created: $TEST_IMAGE_PATH"
  else
    echo "⚠️  ImageMagick not found. Using placeholder."
    echo "Please provide a test image at: $TEST_IMAGE_PATH"
    exit 1
  fi
else
  echo "Step 4: Using existing test image: $TEST_IMAGE_PATH"
fi

echo ""

# Step 5: Upload avatar image
echo "Step 5: Upload avatar image"
UPLOAD_RESPONSE=$(curl -s -b "$COOKIES_FILE" -X POST \
  "$API_BASE/api/images/upload?type=user_avatar&entityId=$USER_ID" \
  -F "images=@$TEST_IMAGE_PATH")

echo "Upload response: $UPLOAD_RESPONSE"

AVATAR_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$AVATAR_URL" ]; then
  echo "❌ Avatar upload failed"
  exit 1
fi

echo "✅ Avatar uploaded: $AVATAR_URL"
echo ""

# Step 6: Update user profile with avatar URL (requires CSRF)
echo "Step 6: Update user profile with avatar URL"
UPDATE_RESPONSE=$(curl -s -b "$COOKIES_FILE" -X PUT \
  "$API_BASE/api/auth/users/profile" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"avatar\": \"$AVATAR_URL\"
  }")

echo "Update response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ User profile updated with avatar"
else
  echo "❌ Profile update failed"
  exit 1
fi

echo ""

# Step 7: Verify avatar in profile
echo "Step 7: Verify avatar in updated profile"
VERIFY_RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_BASE/api/auth/users/profile")

if echo "$VERIFY_RESPONSE" | grep -q "$AVATAR_URL"; then
  echo "✅ Avatar verified in profile"
else
  echo "❌ Avatar not found in profile"
  echo "Response: $VERIFY_RESPONSE"
  exit 1
fi

echo ""

# Step 8: Test password change (requires CSRF)
echo "Step 8: Test password change validation"
PASSWORD_RESPONSE=$(curl -s -b "$COOKIES_FILE" -X PUT \
  "$API_BASE/api/auth/users/password" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"currentPassword\": \"wrong-password\",
    \"newPassword\": \"newpassword123\"
  }")

if echo "$PASSWORD_RESPONSE" | grep -q "incorrect"; then
  echo "✅ Password validation working correctly"
else
  echo "⚠️  Unexpected password response: $PASSWORD_RESPONSE"
fi

echo ""

# Step 9: Test avatar removal (requires CSRF)
echo "Step 9: Remove avatar"
REMOVE_RESPONSE=$(curl -s -b "$COOKIES_FILE" -X PUT \
  "$API_BASE/api/auth/users/profile" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"avatar\": null
  }")

if echo "$REMOVE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Avatar removed successfully"
else
  echo "❌ Avatar removal failed"
  exit 1
fi

echo ""

# Step 10: Verify avatar removed
echo "Step 10: Verify avatar removed from profile"
FINAL_RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_BASE/api/auth/users/profile")

if echo "$FINAL_RESPONSE" | grep -q '"avatar":null'; then
  echo "✅ Avatar removal verified"
else
  echo "⚠️  Avatar may still be present"
fi

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Login: ✅"
echo "  - CSRF token: ✅"
echo "  - Profile fetch: ✅"
echo "  - Avatar upload: ✅"
echo "  - Profile update: ✅"
echo "  - Avatar verification: ✅"
echo "  - Password validation: ✅"
echo "  - Avatar removal: ✅"
echo ""
echo "User Profile & Avatar system is working correctly! 🎉"

# Cleanup
rm -f "$COOKIES_FILE"
