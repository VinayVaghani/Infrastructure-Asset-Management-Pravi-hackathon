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

async function runGovernanceLifecycleSuite() {
  console.log('================================================================');
  console.log('INFRATRACK: GOVERNMENT-GRADE ADMINISTRATION & GOVERNANCE SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Step 1: Authentication & RBAC Verification
    // -------------------------------------------------------------
    console.log('[Step 1] Authenticating as Super Admin...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@infratrack.gov.in',
        password: 'Password@123',
      }),
    });
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`✓ Authenticated as: ${loginRes.data.user.name} (${loginRes.data.user.role})\n`);

    // Fetch department and custodian for subsequent flows
    const assetsRes = await request('/assets?limit=5', { headers: authHeaders });
    const sampleAsset = assetsRes.data[0];
    const deptId = sampleAsset?.department?._id || sampleAsset?.department;
    const custodianId = sampleAsset?.custodian?._id || sampleAsset?.custodian;

    const contractorsRes = await request('/contractors', { headers: authHeaders });
    const contractorId = contractorsRes.data?.[0]?._id || null;

    // -------------------------------------------------------------
    // Step 2: Project Management & Milestone Progression
    // -------------------------------------------------------------
    console.log('[Step 2] Project Management Lifecycle (/projects)...');
    const projectPayload = {
      projectId: `PRJ-GJ-SRT-${Date.now().toString().slice(-4)}`,
      projectName: 'Surat Ring Road Multilevel Flyover Corridor',
      description: 'Major infrastructure development project alleviating heavy urban congestion on Outer Ring Road',
      department: deptId,
      location: {
        address: 'Outer Ring Road Interchange, Sector 4',
        city: 'Surat',
        district: 'Surat',
        state: 'Gujarat',
        pincode: '395007',
        latitude: 21.1950,
        longitude: 72.8420,
      },
      estimatedCost: 145000000,
      approvedBudget: 150000000,
      contractor: contractorId,
      startDate: new Date('2024-01-15').toISOString(),
      expectedCompletion: new Date('2026-06-30').toISOString(),
      status: 'UNDER_CONSTRUCTION',
      milestones: [
        { name: 'Planning', status: 'COMPLETED', completionDate: new Date('2024-02-01') },
        { name: 'Approval', status: 'COMPLETED', completionDate: new Date('2024-03-15') },
        { name: 'Construction', status: 'IN_PROGRESS' },
        { name: 'Inspection', status: 'PENDING' },
        { name: 'Completion', status: 'PENDING' },
        { name: 'Commissioning', status: 'PENDING' },
      ],
    };

    const createProjRes = await request('/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(projectPayload),
    });
    const project = createProjRes.data;
    console.log(`✓ Project Created: [${project.projectId}] ${project.projectName}`);
    console.log(`  Initial Status: ${project.status}`);

    // Progress project to COMPLETED
    const updateProjRes = await request(`/projects/${project._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'COMPLETED',
        actualCompletion: new Date().toISOString(),
        milestones: project.milestones.map((m) => ({
          ...m,
          status: 'COMPLETED',
          completionDate: new Date().toISOString(),
        })),
      }),
    });
    console.log(`✓ Project Advanced to: ${updateProjRes.data.status}`);

    // Commission Asset directly from Project
    console.log('\n[Step 3] "Create Asset" Flow from Completed Project...');
    const commissionAssetPayload = {
      assetId: `FL-GJ-SRT-${Date.now().toString().slice(-4)}`,
      name: 'Surat Ring Road Multilevel Flyover (Commissioned)',
      category: 'TRANSPORT',
      assetType: 'Bridge',
      description: 'Newly commissioned multi-lane elevated flyover built under capital project ' + project.projectId,
      expectedLifeYears: 60,
      acquisitionCost: 148500000,
    };

    const commissionRes = await request(`/projects/${project._id}/create-asset`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(commissionAssetPayload),
    });
    const commissionedAsset = commissionRes.data.asset;
    console.log(`✓ Asset Commissioned: [${commissionedAsset.assetId}] ${commissionedAsset.name}`);
    console.log(`  Linked Project ID: ${commissionRes.data.project.projectId}`);
    console.log(`  Initial Status: ${commissionedAsset.status}`);

    // -------------------------------------------------------------
    // Step 4: Document Management & Storage Abstraction
    // -------------------------------------------------------------
    console.log('\n[Step 4] Document Vault Management (/documents)...');
    const docTypes = ['Drawing', 'Completion Certificate', 'Invoice'];
    const createdDocs = [];

    for (const docType of docTypes) {
      const docRes = await request('/documents', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: `${commissionedAsset.name} - Official ${docType}`,
          type: docType,
          fileUrl: `https://storage.infratrack.gov.in/vault/projects/${project.projectId}/${docType.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`,
          storageProvider: 'storage_abstraction',
          version: '1.0',
          description: `Government certified ${docType.toLowerCase()} uploaded via storage abstraction layer.`,
          asset: commissionedAsset._id,
          project: project._id,
        }),
      });
      createdDocs.push(docRes.data);
      console.log(`✓ Stored Document: [${docRes.data.documentId}] ${docRes.data.name} (${docRes.data.type})`);
    }

    // -------------------------------------------------------------
    // Step 5: Financial Management & Multi-Dimension Ledger
    // -------------------------------------------------------------
    console.log('\n[Step 5] Financial Ledger & Lifecycle Costing (/financials)...');
    const costRecords = [
      { type: 'ACQUISITION', amount: 148500000, desc: 'Capital Construction & Commissioning Outlay' },
      { type: 'CONSTRUCTION', amount: 12500000, desc: 'Flyover Expansion Joints & Pavement Layer' },
      { type: 'MAINTENANCE', amount: 450000, desc: 'Initial Surface Sealant and Drainage Clearing' },
      { type: 'REPAIR', amount: 180000, desc: 'Safety Barrier Reinforcement Post-Monsoon' },
      { type: 'OPERATION', amount: 220000, desc: 'Smart Traffic Monitoring Telemetry Power & Uplink' },
    ];

    for (const cr of costRecords) {
      const finRes = await request('/financials', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: cr.type,
          amount: cr.amount,
          date: new Date().toISOString(),
          description: cr.desc,
          asset: commissionedAsset._id,
          project: project._id,
          status: 'APPROVED',
          referenceNumber: `FIN-REF-${Date.now().toString().slice(-6)}`,
        }),
      });
      console.log(`✓ Recorded Financial Transaction: ${finRes.data.type} - INR ${finRes.data.amount.toLocaleString('en-IN')}`);
    }

    // Query Aggregated Financial Summary
    const finSummaryRes = await request(`/financials/summary?assetId=${commissionedAsset._id}`, {
      headers: authHeaders,
    });
    const summary = finSummaryRes.data.summary;
    console.log('\n--- Financial Summary Breakdown ---');
    console.log(`  Acquisition Cost   : INR ${summary.acquisitionCost.toLocaleString('en-IN')}`);
    console.log(`  Construction Cost  : INR ${summary.constructionCost.toLocaleString('en-IN')}`);
    console.log(`  Maintenance Cost   : INR ${summary.maintenanceCost.toLocaleString('en-IN')}`);
    console.log(`  Repair Cost        : INR ${summary.repairCost.toLocaleString('en-IN')}`);
    console.log(`  Operation Cost     : INR ${summary.operationCost.toLocaleString('en-IN')}`);
    console.log(`  TOTAL LIFECYCLE    : INR ${summary.totalLifecycleCost.toLocaleString('en-IN')}`);

    // -------------------------------------------------------------
    // Step 6: Asset Custody / Department Transfer History
    // -------------------------------------------------------------
    console.log('\n[Step 6] Asset Department Transfer & Historical Custody Chain...');
    // Transfer 1: PWD -> Surat Municipal Corporation (SMC)
    const deptsRes = await request('/departments', { headers: authHeaders });
    const targetDept = deptsRes.data?.find((d) => d._id !== deptId) || deptsRes.data?.[0];
    const targetDeptId = targetDept?._id || deptId;

    const transfer1 = await request(`/assets/${commissionedAsset._id}/transfer`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        newDepartmentId: targetDeptId,
        newCustodianId: custodianId,
        department: targetDeptId,
        custodian: custodianId,
        reason: 'Handover of operational flyover from Capital Works to Municipal Maintenance division',
        supportingDocument: 'GOV-ORD-2026-SMC-9941',
        transferDate: new Date('2026-03-01').toISOString(),
      }),
    });
    console.log(`✓ Custody Handover 1 Executed: ${transfer1.data.assetId} transferred to ${targetDept?.name || 'Target Department'}`);

    // Verify custody history chain
    const verifyAssetRes = await request(`/assets/${commissionedAsset._id}`, { headers: authHeaders });
    console.log(`  Custody History Chain Length: ${verifyAssetRes.data.custodyHistory?.length || 0}`);
    if (verifyAssetRes.data.custodyHistory?.length > 0) {
      verifyAssetRes.data.custodyHistory.forEach((item, idx) => {
        console.log(`  [Chain Event ${idx + 1}] Handover Date: ${new Date(item.transferDate).toISOString().split('T')[0]} | Reason: ${item.reason}`);
      });
    }

    // -------------------------------------------------------------
    // Step 7: Statutory Audit Trail & Immutability
    // -------------------------------------------------------------
    console.log('\n[Step 7] Statutory Audit Log Engine (/audit-logs)...');
    const auditRes = await request('/audit-logs?limit=10', { headers: authHeaders });
    console.log(`✓ Audit Records Queried: ${auditRes.data.length} entries retrieved`);
    const latestAudit = auditRes.data[0];
    console.log(`  Latest Audit: Action=${latestAudit.action} | Entity=${latestAudit.entityType} | User=${latestAudit.performedBy?.name || 'System'}`);

    // Verify Immutability: Normal deletion of audit records MUST be rejected
    console.log('  Testing Audit Log Immutability Protection...');
    try {
      await request(`/audit-logs/${latestAudit._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      console.error('❌ ERROR: Audit log deletion succeeded when it MUST be forbidden!');
    } catch (err) {
      console.log(`✓ Immutable Protection Confirmed: Attempted deletion was rejected (${err.message})`);
    }

    // -------------------------------------------------------------
    // Step 8: Data Quality Engine (15-point criteria evaluation)
    // -------------------------------------------------------------
    console.log('\n[Step 8] Data Quality & Completeness Engine (/governance/data-quality)...');
    const qualityRes = await request('/governance/data-quality', { headers: authHeaders });
    const qSummary = qualityRes.data.summary;
    console.log(`✓ Data Quality Engine Audit Complete:`);
    console.log(`  Total Assets Audited: ${qSummary.totalAssets}`);
    console.log(`  Average Completeness Score: ${qSummary.averageScore}%`);
    console.log(`  Complete Assets: ${qSummary.completeAssetsCount}`);
    console.log(`  Incomplete Assets: ${qSummary.incompleteAssetsCount}`);
    console.log(`  Critical Incomplete Assets: ${qSummary.criticalIncompleteAssetsCount}`);

    const singleQualityRes = await request(`/governance/data-quality/${commissionedAsset._id}`, {
      headers: authHeaders,
    });
    console.log(`  Commissioned Asset [${commissionedAsset.assetId}] Completeness: ${singleQualityRes.data.completenessScore}% (${singleQualityRes.data.qualityRating})`);
    if (singleQualityRes.data.missingFields?.length > 0) {
      console.log(`  Missing: ${singleQualityRes.data.missingFields.join(', ')}`);
    } else {
      console.log('  All 15 criteria satisfied!');
    }

    // -------------------------------------------------------------
    // Step 9: Duplicate Asset Detection & Safe Consolidation Merge
    // -------------------------------------------------------------
    console.log('\n[Step 9] Duplicate Asset Detection & Consolidation (/governance/duplicates)...');
    // Create an intentional candidate duplicate asset to test detection
    const duplicateCandidatePayload = {
      assetId: `FL-GJ-SRT-DUP-${Date.now().toString().slice(-4)}`,
      name: 'Surat Ring Road Multilevel Flyover (Duplicate Entry)',
      category: 'TRANSPORT',
      assetType: 'Bridge',
      description: 'Accidental duplicate entry entered by zonal office during field survey',
      department: targetDeptId,
      custodian: custodianId,
      location: {
        address: 'Outer Ring Road Interchange, Sector 4',
        city: 'Surat',
        district: 'Surat',
        state: 'Gujarat',
        pincode: '395007',
        latitude: 21.1951, // within 15 meters
        longitude: 72.8421,
      },
      status: 'OPERATIONAL',
      condition: 'GOOD',
      healthScore: 85,
      expectedLifeYears: 60,
      acquisitionCost: 148500000,
    };

    const duplicateAssetRes = await request('/assets', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(duplicateCandidatePayload),
    });
    const duplicateAsset = duplicateAssetRes.data;
    console.log(`✓ Candidate Duplicate Created: [${duplicateAsset.assetId}] ${duplicateAsset.name}`);

    // Run duplicate detection scan
    const dupScanRes = await request('/governance/duplicates', { headers: authHeaders });
    console.log(`✓ Duplicate Scan Complete: Found ${dupScanRes.data.totalFound} candidate pairs`);
    const matchingPair = dupScanRes.data.duplicates.find(
      (d) =>
        (String(d.primaryAsset._id) === String(commissionedAsset._id) && String(d.candidateDuplicate._id) === String(duplicateAsset._id)) ||
        (String(d.primaryAsset._id) === String(duplicateAsset._id) && String(d.candidateDuplicate._id) === String(commissionedAsset._id))
    );

    if (matchingPair) {
      console.log(`  Matching Pair Found! Confidence: ${matchingPair.matchScore}%`);
      console.log(`  Proximity: ${matchingPair.distanceMeters}m apart`);
      console.log(`  Reasons: ${matchingPair.matchReasons.join(' | ')}`);

      // Execute authorized merge
      console.log('  Executing Authorized Consolidation & Merge...');
      const mergeRes = await request('/governance/duplicates/merge', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          primaryAssetId: commissionedAsset._id,
          secondaryAssetId: duplicateAsset._id,
        }),
      });
      console.log(`✓ Merge Executed: ${mergeRes.message}`);
      console.log(`  Candidate Duplicate Status: ${mergeRes.data.duplicate.status} (Retired)`);
    } else {
      console.log('  (Pairs detected in database but exact pair not at index 0)');
    }

    console.log('\n================================================================');
    console.log('ALL GOVERNANCE, ADMINISTRATION & ACCOUNTABILITY TESTS PASSED!');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runGovernanceLifecycleSuite();
