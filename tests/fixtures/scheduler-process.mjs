import {openLocalScheduler} from '../../src/platform/orchestration/scheduler.mjs';
import {listRoleDispatches} from '../../src/platform/orchestration/role-dispatch.mjs';

const scheduler=await openLocalScheduler(JSON.parse(process.env.STACKPILOT_TEST_DB),{enabledRoles:listRoleDispatches().map(role=>role.roleId)});
try{
 const run=process.argv[3]==='run';
 const result=await scheduler.scope('org-alpha').tick({window:JSON.parse(process.argv[2]),run});
 console.log(JSON.stringify(run?{enqueued:result.executions.filter(row=>!row.resumed).length,resumed:result.executions.filter(row=>row.resumed).length}:{enqueued:result.executions.length}));
}finally{await scheduler.close();}
