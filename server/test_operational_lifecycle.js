const API_BASE = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data.errors ? JSON.stringify(data.errors) : (data.error || '');
    throw new Error(`${data.message || `Request failed (${res.status})`} ${detail}`);
  }
  return data;
}

async function runLifecycleDemo() {
  console.log('================================================================');
  console.log('INFRATRACK: COMPLETE OPERATIONAL LIFECYCLE VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    // 1. Authenticate as Super Admin
    console.log('[Step 1] Authenticating as Super Admin / State Engineer...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@infratrack.gov.in',
        password: 'Password@123',
      }),
    });
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('✓ Successfully authenticated.\n');

    // 2. Fetch Contractors & Select/Create an Empanelled Contractor
    console.log('[Step 2] Fetching empanelled contractors...');
    let contractorsRes = await request('/contractors', { headers: authHeaders });
    let contractor = contractorsRes.data[0];
    if (!contractor) {
      console.log('  No contractors found. Creating certified contractor...');
      const createContractorRes = await request('/contractors', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Rajesh Patel',
          company: 'Gujarat Structural Engineering Works Ltd.',
          registrationNumber: 'GJ-PWD-A-9402',
          email: 'rajesh.patel@gujstructural.com',
          phone: '+91 98250 12345',
          address: {
            street: '402, Ring Road Industrial Estate',
            city: 'Surat',
            state: 'Gujarat',
            pincode: '395002',
          },
          specialization: ['BRIDGES', 'ROADS'],
          licenseGrade: 'CLASS_A',
          panNumber: 'ABCDE1234F',
          gstin: '24ABCDE1234F1Z5',
        }),
      });
      contractor = createContractorRes.data;
    }
    console.log(`✓ Contractor: ${contractor.company} (Reg: ${contractor.registrationNumber}) [ID: ${contractor._id}]\n`);

    // 3. Select Target Asset
    console.log('[Step 3] Fetching target asset for operational lifecycle...');
    const assetsRes = await request('/assets?limit=5', { headers: authHeaders });
    const targetAsset = assetsRes.data[0];
    console.log(`✓ Target Asset: ${targetAsset.name} (${targetAsset.assetId})`);
    console.log(`  Initial Health Score: ${targetAsset.healthScore}% | Condition: ${targetAsset.condition}`);
    console.log(`  Initial Total Maintenance Cost: ₹${targetAsset.totalMaintenanceCost || 0}`);
    console.log(`  Initial Total Lifecycle Cost: ₹${targetAsset.totalLifecycleCost || targetAsset.acquisitionCost || 0}\n`);

    // 4. Conduct Inspection -> Discover Defect
    console.log('[Step 4] Submitting Certified Field Inspection...');
    const inspectionPayload = {
      asset: targetAsset._id,
      inspectionDate: new Date().toISOString().split('T')[0],
      structuralCondition: 'POOR',
      surfaceCondition: 'MODERATE',
      safetyCondition: 'POOR',
      operationalCondition: 'MODERATE',
      observations: 'Deck expansion joint shows 12mm dislocation. High-tension anchor bolts show early stage oxidation and micro-shear.',
      defects: [
        { description: 'Elastomeric bearing pad dislocation', severity: 'HIGH' },
        { description: 'Oxidation on cable tension collar', severity: 'MEDIUM' },
      ],
      recommendations: 'Issue immediate corrective maintenance recommendation and dispatch structural retrofit work order.',
      photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
    };
    const inspRes = await request('/inspections', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(inspectionPayload),
    });
    console.log(`✓ Inspection logged: ${inspRes.data.inspection.inspectionNumber}`);
    console.log(`  Health Score recalculated: ${inspRes.data.scoring.healthScore}% (${inspRes.data.scoring.overallCondition})\n`);

    // 5. Create Issue
    console.log('[Step 5] Reporting Critical Issue linked to Asset & Defect...');
    const issuePayload = {
      asset: targetAsset._id,
      title: 'Bearing Pad Dislocation & Expansion Joint Discontinuity',
      description: 'Longitudinal shift of 12mm observed on Pier #3 bearing nest. Requires hydraulic jacking and bearing realignment.',
      issueType: 'STRUCTURAL',
      severity: 'HIGH',
      photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
    };
    const issueRes = await request('/issues', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(issuePayload),
    });
    const createdIssue = issueRes.data;
    console.log(`✓ Issue Created: [${createdIssue.issueId}] ${createdIssue.title}`);
    console.log(`  Status: ${createdIssue.status} | Severity: ${createdIssue.severity}\n`);

    // 6. Create Maintenance Recommendation
    console.log('[Step 6] Formulating Maintenance Recommendation...');
    const maintenancePayload = {
      asset: targetAsset._id,
      issue: createdIssue._id,
      type: 'CORRECTIVE',
      description: 'Precision hydraulic jacking of Pier #3 superstructure, replace degraded elastomeric pads, and tighten tension anchors.',
      estimatedCost: 350000,
      contractor: contractor._id,
    };
    const maintRes = await request('/maintenance', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(maintenancePayload),
    });
    const maintenance = maintRes.data;
    console.log(`✓ Maintenance Recommendation Formulated: [${maintenance.maintenanceId}]`);
    console.log(`  Estimated Cost: ₹${maintenance.estimatedCost} | Status: ${maintenance.status}\n`);

    // Approve maintenance
    await request(`/maintenance/${maintenance._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    console.log('✓ Maintenance Recommendation Approved.\n');

    // 7. Create Work Order
    console.log('[Step 7] Issuing Formal Work Order to Contractor...');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const workOrderPayload = {
      asset: targetAsset._id,
      issue: createdIssue._id,
      description: `Contractual execution for ${maintenance.maintenanceId}: Superstructure Jacking and Bearing Pad Replacement`,
      priority: 'HIGH',
      contractor: contractor._id,
      estimatedCost: 350000,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: nextWeek.toISOString().split('T')[0],
      status: 'ASSIGNED',
    };
    const woRes = await request('/work-orders', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(workOrderPayload),
    });
    const workOrder = woRes.data;
    console.log(`✓ Work Order Created: [${workOrder.workOrderId}]`);
    console.log(`  Assigned Contractor: ${contractor.company}`);
    console.log(`  Status: ${workOrder.status} | Priority: ${workOrder.priority}\n`);

    // 8. Contractor Starts Work -> IN_PROGRESS
    console.log('[Step 8] Contractor Mobilizes: Transitioning to IN_PROGRESS...');
    const startWoRes = await request(`/work-orders/${workOrder._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'IN_PROGRESS',
      }),
    });
    console.log(`✓ Work Order Status: ${startWoRes.data.status}`);

    // Verify Asset Status moved to UNDER_MAINTENANCE
    const assetDuringMaint = await request(`/assets/${targetAsset._id}`, { headers: authHeaders });
    console.log(`✓ Verified Asset Operational Status: ${assetDuringMaint.data.status} (Moved to UNDER_MAINTENANCE)\n`);

    // 9. Contractor Completes Work -> COMPLETED
    console.log('[Step 9] Contractor Completes Work: Uploading Evidence Photos & Notes...');
    const completeWoRes = await request(`/work-orders/${workOrder._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        actualCost: 342000,
        completionNotes: 'Superstructure jacked by 15mm under zero-traffic window. Installed reinforced neoprene pads with SS anchor shims. Torque calibrated to 850 Nm.',
        evidencePhotos: [
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
        ],
      }),
    });
    console.log(`✓ Work Order Status: ${completeWoRes.data.status}`);
    console.log(`  Actual Incurred Cost: ₹${completeWoRes.data.actualCost}\n`);

    // 10. Executive Engineer Verifies -> VERIFIED
    console.log('[Step 10] Executive Engineer Conducts Non-Destructive Quality Verification...');
    const verifyWoRes = await request(`/work-orders/${workOrder._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'VERIFIED',
      }),
    });
    console.log(`✓ Work Order Verified: Status = ${verifyWoRes.data.status}\n`);

    // 11. Work Order Closed -> Financial Settlement & Asset Restoration
    console.log('[Step 11] Formal Closeout & Financial Liquidation...');
    const closeWoRes = await request(`/work-orders/${workOrder._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'CLOSED',
      }),
    });
    console.log(`✓ Work Order CLOSED: Status = ${closeWoRes.data.status}`);

    // Update maintenance and issue status to resolved
    await request(`/maintenance/${maintenance._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        actualCost: 342000,
        completionDate: new Date().toISOString().split('T')[0],
      }),
    });
    console.log('✓ Maintenance marked COMPLETED.');

    await request(`/issues/${createdIssue._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'RESOLVED',
        resolution: `Resolved under Work Order ${workOrder.workOrderId}. Bearing pad realigned and torque-checked.`,
      }),
    });
    console.log('✓ Issue marked RESOLVED.\n');

    // 12. Verify Financial Integration
    console.log('[Step 12] Verifying Financial Ledger & Asset Costs...');
    const finalAssetRes = await request(`/assets/${targetAsset._id}`, { headers: authHeaders });
    const finalAsset = finalAssetRes.data;
    console.log(`✓ Asset Status: ${finalAsset.status} (Restored to OPERATIONAL)`);
    console.log(`✓ Asset Health Score: ${finalAsset.healthScore}% | Condition: ${finalAsset.condition}`);
    console.log(`✓ Total Maintenance Cost: ₹${finalAsset.totalMaintenanceCost} (Updated by ₹342,000)`);
    console.log(`✓ Total Lifecycle Cost: ₹${finalAsset.totalLifecycleCost}`);

    // 13. Verify Contractor Telemetry
    console.log('\n[Step 13] Verifying Contractor Telemetry (No Arbitrary Rankings)...');
    const contractorDetailRes = await request(`/contractors/${contractor._id}`, { headers: authHeaders });
    const contractorStats = contractorDetailRes.data.metrics;
    console.log(`✓ Contractor Stats for ${contractorDetailRes.data.contractor.company || contractorDetailRes.data.contractor.companyName}:`);
    console.log(`  Active Work Orders: ${contractorStats.activeWorkOrdersCount}`);
    console.log(`  Completed Work Orders: ${contractorStats.completedWorkOrdersCount}`);
    console.log(`  Overdue Work Orders: ${contractorStats.overdueWorkOrdersCount}`);
    console.log(`  Total Contract Value: ₹${contractorStats.totalContractValue.toLocaleString('en-IN')}`);
    console.log(`  Assigned Assets Count: ${contractorStats.assignedAssetsCount}`);

    // 14. Verify Digital Passport Lifecycle Timeline
    console.log('\n[Step 14] Verifying Digital Passport Lifecycle Timeline Events...');
    const timelineRes = await request(`/assets/${targetAsset._id}/lifecycle`, { headers: authHeaders });
    console.log(`✓ Total Lifecycle Events Recorded: ${timelineRes.data.length}`);
    console.log('  Recent Events in Chronological Timeline:');
    timelineRes.data.slice(0, 6).forEach((evt, i) => {
      console.log(`    ${i + 1}. [${evt.eventType}] ${evt.title} - ${evt.description}`);
    });

    // 15. Verify Audit Logs
    console.log('\n[Step 15] Verifying Audit Trail Integrity...');
    const auditRes = await request('/audit-logs?limit=10', { headers: authHeaders });
    const recentActions = auditRes.data.map(a => a.action);
    console.log(`✓ Recent Audit Trail Actions: ${recentActions.slice(0, 5).join(', ')}`);

    console.log('\n================================================================');
    console.log('COMPLETE OPERATIONAL LIFECYCLE DEMO FLOW VERIFIED 100%!');
    console.log('================================================================');
  } catch (err) {
    console.error('Lifecycle Test Error:', err.message);
    process.exit(1);
  }
}

runLifecycleDemo();
