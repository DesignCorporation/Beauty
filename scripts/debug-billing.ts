import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Scanning Tenants for Staff Counts...');
  
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    include: {
      users: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true
        }
      },
      subscription: true
    }
  });

  for (const tenant of tenants) {
    console.log(`
🏢 Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`   Subscription Stored Seats: ${tenant.subscription?.staffSeatCount ?? 'N/A'}`);
    
    const allUsers = tenant.users;
    console.log(`   Total Users: ${allUsers.length}`);
    
    // Filter Logic matching TASK-009
    const billableUsers = allUsers.filter(u => 
      ['MANAGER', 'STAFF_MEMBER', 'RECEPTIONIST', 'ACCOUNTANT'].includes(u.role) &&
      u.role !== 'SALON_OWNER' && 
      u.status === 'ACTIVE'
    );
    
    console.log(`   Billable Users (Calculated): ${billableUsers.length}`);
    
    if (billableUsers.length > 0) {
      console.log('   📝 List of Billable Users:');
      billableUsers.forEach(u => {
        console.log(`      - ${u.firstName} ${u.lastName} (${u.email}) [${u.role}]`);
      });
    }
    
    // Check for Owner
    const owners = allUsers.filter(u => u.role === 'SALON_OWNER');
    console.log(`   Owners (Free): ${owners.length}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
