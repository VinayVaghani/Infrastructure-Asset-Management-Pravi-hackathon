const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db');
const { ROLES, ASSET_CATEGORIES, ASSET_STATUS, ASSET_CONDITION, LIFECYCLE_EVENTS, WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } = require('../utils/constants');

// Models
const User = require('../models/User');
const Department = require('../models/Department');
const Contractor = require('../models/Contractor');
const Asset = require('../models/Asset');
const Project = require('../models/Project');
const Inspection = require('../models/Inspection');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const WorkOrder = require('../models/WorkOrder');
const Issue = require('../models/Issue');
const Document = require('../models/Document');
const FinancialRecord = require('../models/FinancialRecord');
const LifecycleEvent = require('../models/LifecycleEvent');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const { demoUsers, departmentsData, contractorsData } = require('./seedData');

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seeder] Cleaning existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Contractor.deleteMany({}),
      Asset.deleteMany({}),
      Project.deleteMany({}),
      Inspection.deleteMany({}),
      MaintenanceRecord.deleteMany({}),
      WorkOrder.deleteMany({}),
      Issue.deleteMany({}),
      Document.deleteMany({}),
      FinancialRecord.deleteMany({}),
      LifecycleEvent.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seeder] Seeding Departments...');
    const createdDepartments = await Department.insertMany(departmentsData);
    const pwdDept = createdDepartments.find((d) => d.code === 'PWD');
    const wrdDept = createdDepartments.find((d) => d.code === 'WRD');
    const transDept = createdDepartments.find((d) => d.code === 'TRANS');
    const energyDept = createdDepartments.find((d) => d.code === 'ENERGY');
    const healthDept = createdDepartments.find((d) => d.code === 'HEALTH');

    console.log('[Seeder] Seeding Contractors...');
    const createdContractors = await Contractor.insertMany(contractorsData);
    const apexContractor = createdContractors[0];

    console.log('[Seeder] Seeding Users with hashed credentials...');
    // Create users individually so pre-save bcrypt hook runs
    const usersMap = {};
    for (const userData of demoUsers) {
      let deptId = null;
      if (userData.role === ROLES.DEPARTMENT_ADMIN || userData.role === ROLES.ENGINEER) {
        deptId = pwdDept._id;
      } else if (userData.role === ROLES.INSPECTOR) {
        deptId = wrdDept._id;
      } else if (userData.role === ROLES.FINANCE_OFFICER) {
        deptId = pwdDept._id;
      }

      const user = await User.create({
        ...userData,
        department: deptId,
      });
      usersMap[userData.role] = user;
    }

    const superAdmin = usersMap[ROLES.SUPER_ADMIN];
    const deptAdmin = usersMap[ROLES.DEPARTMENT_ADMIN];
    const engineer = usersMap[ROLES.ENGINEER];
    const inspector = usersMap[ROLES.INSPECTOR];
    const finance = usersMap[ROLES.FINANCE_OFFICER];
    const contractorUser = usersMap[ROLES.CONTRACTOR];
    const auditor = usersMap[ROLES.AUDITOR];

    // Link Head of Department
    pwdDept.headOfDepartment = deptAdmin._id;
    await pwdDept.save();

    console.log('[Seeder] Seeding Capital Projects...');
    const project1 = await Project.create({
      projectCode: 'PRJ-GJ-2022-001',
      name: 'Tapi River Bridge & Arterial Link Construction',
      description: 'Major pre-stressed concrete 6-lane bridge over Tapi river connecting Adajan and Athwa.',
      department: pwdDept._id,
      status: 'COMPLETED',
      budget: 1850000000, // ₹185 Cr
      spentAmount: 1824000000,
      startDate: new Date('2022-01-15'),
      estimatedEndDate: new Date('2024-03-31'),
      actualEndDate: new Date('2024-03-20'),
      contractor: apexContractor._id,
      createdBy: deptAdmin._id,
    });

    const project2 = await Project.create({
      projectCode: 'PRJ-GJ-2023-018',
      name: 'Surat Smart Solar & Microgrid Modernization',
      description: 'Solar panel deployment across government complexes and high-voltage grid stability upgrades.',
      department: energyDept._id,
      status: 'IN_PROGRESS',
      budget: 450000000, // ₹45 Cr
      spentAmount: 310000000,
      startDate: new Date('2023-06-01'),
      estimatedEndDate: new Date('2025-06-30'),
      contractor: createdContractors[1]._id,
      createdBy: superAdmin._id,
    });

    console.log('[Seeder] Seeding Infrastructure Assets with Location & Health Score...');
    const sampleAssets = [
      {
        assetId: 'BR-GJ-SRT-000124',
        name: 'Sardar Vallabhbhai Patel Cable-Stayed Bridge',
        category: ASSET_CATEGORIES.TRANSPORT,
        assetType: 'Bridge',
        description: 'Iconic 6-lane cable-stayed bridge spanning 918 meters across River Tapi, connecting Athwa and Pal.',
        department: pwdDept._id,
        custodian: engineer._id,
        location: {
          address: 'Athwalines to Pal Expressway Link',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395007',
          latitude: 21.1824,
          longitude: 72.7984,
        },
        status: ASSET_STATUS.OPERATIONAL,
        condition: ASSET_CONDITION.GOOD,
        healthScore: 89,
        installationDate: new Date('2022-04-10'),
        commissioningDate: new Date('2024-03-25'),
        expectedLifeYears: 75,
        acquisitionCost: 1824000000,
        totalMaintenanceCost: 14500000,
        createdBy: superAdmin._id,
      },
      {
        assetId: 'RD-GJ-SRT-000512',
        name: 'Ring Road Express Corridor Phase II (Majura to Sahara)',
        category: ASSET_CATEGORIES.TRANSPORT,
        assetType: 'Road',
        description: 'Heavy vehicle bypass corridor with bituminous concrete overlay and dual stormwater channels.',
        department: pwdDept._id,
        custodian: engineer._id,
        location: {
          address: 'Ring Road Inner Radial Section',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395002',
          latitude: 21.1959,
          longitude: 72.8311,
        },
        status: ASSET_STATUS.UNDER_MAINTENANCE,
        condition: ASSET_CONDITION.MODERATE,
        healthScore: 68,
        installationDate: new Date('2019-02-15'),
        commissioningDate: new Date('2020-01-10'),
        expectedLifeYears: 20,
        acquisitionCost: 650000000,
        totalMaintenanceCost: 48000000,
        createdBy: deptAdmin._id,
      },
      {
        assetId: 'WT-GJ-SRT-000089',
        name: 'Adajan 15 MLD Water Treatment & Reverse Osmosis Plant',
        category: ASSET_CATEGORIES.WATER,
        assetType: 'Treatment Plant',
        description: 'Advanced drinking water filtration, rapid gravity sand filters, and chlorination unit.',
        department: wrdDept._id,
        custodian: inspector._id,
        location: {
          address: 'Near LP Savani Circle, Adajan',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395009',
          latitude: 21.2014,
          longitude: 72.7842,
        },
        status: ASSET_STATUS.OPERATIONAL,
        condition: ASSET_CONDITION.EXCELLENT,
        healthScore: 94,
        installationDate: new Date('2021-08-01'),
        commissioningDate: new Date('2022-02-28'),
        expectedLifeYears: 30,
        acquisitionCost: 420000000,
        totalMaintenanceCost: 18500000,
        createdBy: superAdmin._id,
      },
      {
        assetId: 'BD-GJ-SRT-000340',
        name: 'Civil Hospital Multi-Specialty Trauma Care Center',
        category: ASSET_CATEGORIES.BUILDINGS,
        assetType: 'Hospital',
        description: '6-storey earthquake-resistant G+5 medical facility with 350 beds and intensive care units.',
        department: healthDept._id,
        custodian: deptAdmin._id,
        location: {
          address: 'Majura Gate Medical Enclave',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395001',
          latitude: 21.1764,
          longitude: 72.8225,
        },
        status: ASSET_STATUS.OPERATIONAL,
        condition: ASSET_CONDITION.GOOD,
        healthScore: 84,
        installationDate: new Date('2018-05-12'),
        commissioningDate: new Date('2020-08-15'),
        expectedLifeYears: 60,
        acquisitionCost: 980000000,
        totalMaintenanceCost: 32000000,
        createdBy: superAdmin._id,
      },
      {
        assetId: 'EN-GJ-SRT-000720',
        name: 'Surat Smart Grid Substation & 5MW Solar Array',
        category: ASSET_CATEGORIES.ENERGY,
        assetType: 'Solar Plant',
        description: 'Grid-connected rooftop and ground-mounted monocrystalline solar panels with SCADA telemetry.',
        department: energyDept._id,
        custodian: engineer._id,
        location: {
          address: 'Pandesara Green Energy Sector',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '394221',
          latitude: 21.1438,
          longitude: 72.8367,
        },
        status: ASSET_STATUS.OPERATIONAL,
        condition: ASSET_CONDITION.EXCELLENT,
        healthScore: 96,
        installationDate: new Date('2023-01-20'),
        commissioningDate: new Date('2023-11-15'),
        expectedLifeYears: 25,
        acquisitionCost: 310000000,
        totalMaintenanceCost: 6500000,
        createdBy: superAdmin._id,
      },
      {
        assetId: 'LD-GJ-SRT-000015',
        name: 'Vesu Municipal Botanical Park & Groundwater Recharge Basin',
        category: ASSET_CATEGORIES.LAND,
        assetType: 'Park',
        description: '28-acre eco-urban biodiversity park with percolation lakes and community promenade.',
        department: wrdDept._id,
        custodian: inspector._id,
        location: {
          address: 'VIP Road, Vesu Canal Cross',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395007',
          latitude: 21.1492,
          longitude: 72.7758,
        },
        status: ASSET_STATUS.OPERATIONAL,
        condition: ASSET_CONDITION.GOOD,
        healthScore: 91,
        installationDate: new Date('2021-01-10'),
        commissioningDate: new Date('2021-12-05'),
        expectedLifeYears: 99,
        acquisitionCost: 150000000,
        totalMaintenanceCost: 8900000,
        createdBy: deptAdmin._id,
      },
      {
        assetId: 'BR-GJ-SRT-000045',
        name: 'Old Tapi Causeway Low-Level Barrage',
        category: ASSET_CATEGORIES.TRANSPORT,
        assetType: 'Bridge',
        description: 'Submersible masonry weir constructed in 1995. Facing extreme monsoon scour and foundation degradation.',
        department: pwdDept._id,
        custodian: engineer._id,
        location: {
          address: 'Singanpore to Rander Causeway',
          city: 'Surat',
          district: 'Surat',
          state: 'Gujarat',
          pincode: '395004',
          latitude: 21.2294,
          longitude: 72.8055,
        },
        status: ASSET_STATUS.TEMPORARILY_CLOSED,
        condition: ASSET_CONDITION.CRITICAL,
        healthScore: 36,
        installationDate: new Date('1995-10-15'),
        commissioningDate: new Date('1996-03-01'),
        expectedLifeYears: 30,
        acquisitionCost: 120000000,
        totalMaintenanceCost: 65000000,
        createdBy: superAdmin._id,
      },
    ];

    const createdAssets = await Asset.insertMany(sampleAssets);
    const bridgeAsset = createdAssets[0];
    const roadAsset = createdAssets[1];
    const causewayAsset = createdAssets[6];

    console.log('[Seeder] Recording Complete Lifecycle Event Timeline for Assets...');
    // Real complete lifecycle history as emphasized by the hackathon prompt!
    const lifecycleTimeline = [
      {
        eventType: LIFECYCLE_EVENTS.PROJECT_CREATED,
        asset: bridgeAsset._id,
        project: project1._id,
        performedBy: superAdmin._id,
        description: 'Cabinet sanction and administrative approval granted for Tapi Cable-Stayed Bridge project.',
        timestamp: new Date('2022-01-15T09:30:00Z'),
        metadata: { budgetSanctioned: 1850000000, sanctionedBy: 'State Infrastructure Finance Committee' },
      },
      {
        eventType: LIFECYCLE_EVENTS.CONSTRUCTION_STARTED,
        asset: bridgeAsset._id,
        project: project1._id,
        performedBy: deptAdmin._id,
        description: 'Work order executed with Apex Infrastructure Ltd. Deep pile foundation drilling commenced.',
        timestamp: new Date('2022-04-10T11:00:00Z'),
        metadata: { contractor: apexContractor.companyName, pilesCount: 48 },
      },
      {
        eventType: LIFECYCLE_EVENTS.CONSTRUCTION_COMPLETED,
        asset: bridgeAsset._id,
        project: project1._id,
        performedBy: engineer._id,
        description: 'Main span stay cables tensioned and deck load testing successfully completed up to 120 tonnes.',
        timestamp: new Date('2024-03-20T16:00:00Z'),
        metadata: { testResult: 'PASSED', deflectionUnderLoadMm: 4.2 },
      },
      {
        eventType: LIFECYCLE_EVENTS.ASSET_CREATED,
        asset: bridgeAsset._id,
        performedBy: deptAdmin._id,
        description: 'Official digital asset identity BR-GJ-SRT-000124 generated and recorded in the State Registry.',
        timestamp: new Date('2024-03-22T10:00:00Z'),
        metadata: { uniqueId: 'BR-GJ-SRT-000124', category: 'TRANSPORT', assetType: 'Bridge' },
      },
      {
        eventType: LIFECYCLE_EVENTS.ASSET_COMMISSIONED,
        asset: bridgeAsset._id,
        performedBy: superAdmin._id,
        description: 'Inaugurated and dedicated to the nation by Honorable Chief Minister. Opened for public traffic.',
        timestamp: new Date('2024-03-25T14:30:00Z'),
        metadata: { trafficCapacityPcuPerDay: 85000 },
      },
      {
        eventType: LIFECYCLE_EVENTS.INSPECTION_COMPLETED,
        asset: bridgeAsset._id,
        performedBy: inspector._id,
        description: 'First scheduled biannual structural health and bearing pad deflection audit carried out.',
        timestamp: new Date('2024-09-18T10:15:00Z'),
        metadata: { overallCondition: 'GOOD', healthScore: 89, recommendation: 'Routine quarterly sensor checks' },
      },
      // Road lifecycle events:
      {
        eventType: LIFECYCLE_EVENTS.ASSET_CREATED,
        asset: roadAsset._id,
        performedBy: engineer._id,
        description: 'Asset RD-GJ-SRT-000512 entered into municipal asset registry.',
        timestamp: new Date('2020-01-10T09:00:00Z'),
      },
      {
        eventType: LIFECYCLE_EVENTS.ISSUE_REPORTED,
        asset: roadAsset._id,
        performedBy: engineer._id,
        description: 'Surface rutting and micro-cracking observed on western carriageway following heavy monsoon.',
        timestamp: new Date('2024-08-12T14:00:00Z'),
        metadata: { severity: 'MEDIUM' },
      },
      {
        eventType: LIFECYCLE_EVENTS.MAINTENANCE_STARTED,
        asset: roadAsset._id,
        performedBy: deptAdmin._id,
        description: 'Milling of damaged surface and polymer-modified bitumen resurfacing commenced.',
        timestamp: new Date('2024-09-05T08:00:00Z'),
        metadata: { contractor: apexContractor.companyName, estimatedDurationDays: 45 },
      },
      // Critical Causeway lifecycle events:
      {
        eventType: LIFECYCLE_EVENTS.ISSUE_REPORTED,
        asset: causewayAsset._id,
        performedBy: inspector._id,
        description: 'Pier #4 scour depth exceeded safety margin. Pier cap hairline shear cracks widening.',
        timestamp: new Date('2024-08-01T08:45:00Z'),
        metadata: { severity: 'CRITICAL', riskLevel: 'HIGH_IMMINENT' },
      },
      {
        eventType: LIFECYCLE_EVENTS.INSPECTION_COMPLETED,
        asset: causewayAsset._id,
        performedBy: inspector._id,
        description: 'Urgent structural stability audit concluded. Condition downgraded to CRITICAL.',
        timestamp: new Date('2024-08-03T11:00:00Z'),
        metadata: { healthScore: 36, recommendation: 'Immediate traffic closure and micro-piling retrofit' },
      },
    ];

    await LifecycleEvent.insertMany(lifecycleTimeline);

    console.log('[Seeder] Seeding Inspections...');
    await Inspection.create([
      {
        inspectionNumber: 'INSP-2024-0891',
        asset: bridgeAsset._id,
        inspector: inspector._id,
        scheduledDate: new Date('2024-09-18'),
        conductedDate: new Date('2024-09-18'),
        status: 'COMPLETED',
        overallCondition: ASSET_CONDITION.GOOD,
        checklist: [
          { item: 'Stay cables vibration dampers', passed: true, notes: 'Within 5Hz harmonic tolerances' },
          { item: 'Expansion joints elastomeric seal', passed: true, notes: 'No debris accumulation' },
          { item: 'Pylons concrete surface crack inspection', passed: true, notes: 'Negligible micro-fissures' },
          { item: 'Substructure pier scour inspection', passed: true, notes: 'Foundation stable' },
        ],
        remarks: 'Asset is structurally sound and performing per design benchmarks.',
        score: 89,
        nextInspectionDate: new Date('2025-03-18'),
      },
      {
        inspectionNumber: 'INSP-2024-0712',
        asset: causewayAsset._id,
        inspector: inspector._id,
        scheduledDate: new Date('2024-08-03'),
        conductedDate: new Date('2024-08-03'),
        status: 'COMPLETED',
        overallCondition: ASSET_CONDITION.CRITICAL,
        checklist: [
          { item: 'Pier foundation integrity', passed: false, notes: 'Extreme scouring detected under pier 4' },
          { item: 'Railing and safety barriers', passed: false, notes: 'Damaged by flood debris' },
          { item: 'Bearing pads alignment', passed: false, notes: 'Pads displaced by 15mm' },
        ],
        remarks: 'Immediate traffic closure recommended to avoid structural hazard.',
        score: 36,
        nextInspectionDate: new Date('2024-10-15'),
      },
    ]);

    console.log('[Seeder] Seeding Issues and Work Orders...');
    const issue1 = await Issue.create({
      issueCode: 'ISS-2024-0321',
      title: 'Pavement Depression & Drainage Overflow on Ring Road',
      asset: roadAsset._id,
      reportedBy: engineer._id,
      severity: 'HIGH',
      status: 'WORK_ORDER_CREATED',
      description: 'Continuous heavy truck movement caused 40mm subsidence near Sahara Gate junction.',
      locationDetails: 'Ch. 4+200 km mark, Westbound carriageway',
      photos: [],
    });

    const workOrder1 = await WorkOrder.create({
      orderNumber: 'WO-2024-0094',
      title: 'Expressway Bituminous Rehabilitation & Milling',
      asset: roadAsset._id,
      issue: issue1._id,
      contractor: apexContractor._id,
      assignedTo: contractorUser._id,
      priority: WORK_ORDER_PRIORITY.HIGH,
      status: WORK_ORDER_STATUS.IN_PROGRESS,
      estimatedCost: 18500000,
      actualCost: 12200000,
      targetCompletionDate: new Date('2024-11-15'),
      createdBy: deptAdmin._id,
    });

    console.log('[Seeder] Seeding Maintenance Records...');
    await MaintenanceRecord.create({
      maintenanceId: 'MNT-2024-051',
      asset: roadAsset._id,
      workOrder: workOrder1._id,
      type: 'CORRECTIVE',
      description: 'Cold milling of top 50mm wearing course and relaying of dense bituminous macadam.',
      performedBy: engineer._id,
      contractor: apexContractor._id,
      startDate: new Date('2024-09-05'),
      cost: 12200000,
      partsReplaced: ['Wearing course asphalt', 'Geogrid mesh reinforcement', 'Curb drainage covers'],
      status: 'IN_PROGRESS',
      notes: 'Traffic diverted onto parallel service road during night hours.',
    });

    console.log('[Seeder] Seeding Financial Records...');
    await FinancialRecord.create([
      {
        recordId: 'FIN-2024-001',
        asset: bridgeAsset._id,
        project: project1._id,
        type: 'CAPEX',
        amount: 1824000000,
        transactionDate: new Date('2024-03-25'),
        fiscalYear: '2023-2024',
        invoiceNumber: 'INV-APEX-FINAL-09',
        approvedBy: finance._id,
        status: 'APPROVED',
        description: 'Final milestone payment and commissioning capitalization for Tapi River Bridge.',
      },
      {
        recordId: 'FIN-2024-042',
        asset: roadAsset._id,
        type: 'OPEX',
        amount: 12200000,
        transactionDate: new Date('2024-09-10'),
        fiscalYear: '2024-2025',
        invoiceNumber: 'INV-MNT-2024-08',
        approvedBy: finance._id,
        status: 'APPROVED',
        description: 'Emergency resurfacing and road maintenance allocation.',
      },
    ]);

    console.log('[Seeder] Seeding Notifications...');
    await Notification.create([
      {
        recipient: superAdmin._id,
        title: 'Critical Infrastructure Alert',
        message: 'Tapi Causeway (BR-GJ-SRT-000045) health score dropped to 36. Immediate intervention required.',
        type: 'ALERT',
        link: '/assets',
      },
      {
        recipient: engineer._id,
        title: 'Work Order In Progress',
        message: 'Apex Infrastructure has initiated milling operations on Ring Road Express Corridor.',
        type: 'INFO',
        link: '/work-orders',
      },
    ]);

    console.log('[Seeder] Seeding Audit Logs...');
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'System',
        entityId: 'ROOT',
        performedBy: superAdmin._id,
        changes: { status: 'INITIALIZED', schemaVersion: '1.0.0' },
        ipAddress: '127.0.0.1',
        userAgent: 'InfraTrack Seeder Engine',
      },
      {
        action: 'STATUS_CHANGE',
        entityType: 'Asset',
        entityId: causewayAsset._id,
        performedBy: inspector._id,
        changes: { before: { status: 'OPERATIONAL' }, after: { status: 'TEMPORARILY_CLOSED' } },
        ipAddress: '127.0.0.1',
        userAgent: 'GovNet Inspector Mobile Terminal',
      },
    ]);

    console.log('=======================================================');
    console.log('✅ InfraTrack Database Seeded Successfully!');
    console.log('=======================================================');
    console.log('Demo Logins (Password for all: Password@123):');
    console.log('  1. SUPER_ADMIN:       superadmin@infratrack.gov.in');
    console.log('  2. DEPARTMENT_ADMIN:  pwd.admin@infratrack.gov.in');
    console.log('  3. ENGINEER:          engineer.patel@infratrack.gov.in');
    console.log('  4. INSPECTOR:         inspector.sharma@infratrack.gov.in');
    console.log('  5. FINANCE_OFFICER:   finance.mehta@infratrack.gov.in');
    console.log('  6. CONTRACTOR:        contractor.apex@infratrack.gov.in');
    console.log('  7. AUDITOR:           auditor.desai@infratrack.gov.in');
    console.log('=======================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder Failure]:', error);
    process.exit(1);
  }
};

seedDatabase();
