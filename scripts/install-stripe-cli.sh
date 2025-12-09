#!/bin/bash

# 📦 Install Stripe CLI
# https://stripe.com/docs/stripe-cli#install

echo "📦 Installing Stripe CLI..."
echo

# Detect OS
if [ -f /etc/debian_version ]; then
    echo "Detected Debian/Ubuntu"

    # Add Bintray GPG key
    curl -s https://packages.stripe.dev/api/security/keypair/Stripe-CLI-GPG-KEY/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg

    # Add repository
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list

    # Update and install
    sudo apt update
    sudo apt install stripe -y

elif [ -f /etc/redhat-release ]; then
    echo "Detected RedHat/CentOS"

    # Add repository
    sudo tee /etc/yum.repos.d/stripe.repo << EOF
[stripe]
name=stripe
baseurl=https://packages.stripe.dev/stripe-cli-rpm-local/
enabled=1
gpgcheck=0
EOF

    # Install
    sudo yum install stripe -y

else
    echo "⚠️  Unsupported OS. Please install manually:"
    echo "   https://stripe.com/docs/stripe-cli#install"
    exit 1
fi

echo
echo "✅ Stripe CLI installed!"
echo

# Verify installation
stripe --version

echo
echo "🔑 Next steps:"
echo "1. Login to Stripe:"
echo "   stripe login"
echo
echo "2. Start webhook forwarding:"
echo "   stripe listen --forward-to localhost:6029/webhooks/stripe"
echo
