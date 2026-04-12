// src/seed.js — Seeds the database with initial data
//
// Run this ONCE after setting up the database: npm run db:seed
// It creates the default admin account and starting data.

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Henos Energy ERP database...\n')

  // ── Admin User ──────────────────────────────────────────────
  const adminExists = await prisma.user.findUnique({ where: { id: 'HN-ADMIN-001' } })
  if (!adminExists) {
    const hash = await bcrypt.hash('Admin@Henos2025', 10)
    await prisma.user.create({
      data: {
        id:         'HN-ADMIN-001',
        password:   hash,
        name:       'System Administrator',
        role:       'admin',
        email:      'admin@henosenergy.com',
        department: 'Management',
        modules:    ['dashboard','commercial','accounts','operations','marketing','stations','eazigas','esg','settings','users'],
        active:     true,
        avatar:     'SA',
        isDefault:  true,
      }
    })
    console.log('✅ Admin user created')
    console.log('   ID:       HN-ADMIN-001')
    console.log('   Password: Admin@Henos2025\n')
  } else {
    console.log('ℹ️  Admin user already exists — skipping\n')
  }

  // ── ESG Metrics singleton ───────────────────────────────────
  await prisma.esgMetrics.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })
  console.log('✅ ESG metrics initialized')

  // ── EaziGas Exchange Points ─────────────────────────────────
  const eps = [
    { name:'North-Legon',     location:'North Legon, Greater Accra' },
    { name:'Agbogba',         location:'Agbogba, Greater Accra' },
    { name:'Lakeside Com 8',  location:'Lakeside Community 8, Accra' },
    { name:'Lakeside Shell',  location:'Lakeside Shell, Accra' },
    { name:'Night Market-UG', location:'Night Market, University of Ghana, Legon' },
    { name:'Bush Canteen-UG', location:'Bush Canteen, University of Ghana, Legon' },
  ]
  for (const ep of eps) {
    const existing = await prisma.exchangePoint.findFirst({ where: { name: ep.name } })
    if (!existing) await prisma.exchangePoint.create({ data: ep })
  }
  console.log('✅ EaziGas exchange points seeded')

  // ── Sample Prices ───────────────────────────────────────────
  const prices = [
    { product:'50KG Cylinder',    category:'Cylinder', unit:'per cylinder', price:750 },
    { product:'14.5KG Cylinder',  category:'Cylinder', unit:'per cylinder', price:230 },
    { product:'12.5KG Cylinder',  category:'Cylinder', unit:'per cylinder', price:198 },
    { product:'6KG Cylinder',     category:'Cylinder', unit:'per cylinder', price:95  },
    { product:'3KG Cylinder',     category:'Cylinder', unit:'per cylinder', price:50  },
    { product:'Bulk LPG',         category:'Bulk LPG', unit:'per kg',       price:8.5 },
    { product:'Autogas',          category:'Autogas',  unit:'per litre',    price:12  },
  ]
  const priceCount = await prisma.price.count()
  if (priceCount === 0) {
    await prisma.price.createMany({ data: prices })
    console.log('✅ Sample prices created')
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('   You can now log in with:')
  console.log('   Employee ID: HN-ADMIN-001')
  console.log('   Password:    Admin@Henos2025')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
