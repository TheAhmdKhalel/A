const CONFIG = {
  SPREADSHEET_ID: 'REPLACE_WITH_YOUR_GOOGLE_SHEET_ID',
  SITE_BASE_URL: 'https://ahmadkhalel.com',
  ADMIN_EMAILS: ['REPLACE_WITH_YOUR_GOOGLE_EMAIL'],
  SHEETS: { CLIENTS:'Clients', IDENTITY:'Identity Forms', WEBSITE:'Website Forms', BOTH:'Identity + Website Forms' }
};
function doGet(e){
  const p=(e&&e.parameter)||{};
  if(p.op==='admin'){ return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Ahmad Khalel — Admin'); }
  if(p.op!=='verify') return json_({ok:true,service:'Ahmad Khalel Forms'});
  try{
    const token=clean_(p.token), whatsapp=normalizePhone_(p.whatsapp);
    if(!token||!whatsapp) return json_({ok:false,verified:false});
    const c=findClientByToken_(token);
    const verified=!!c&&normalizePhone_(c.whatsapp)===whatsapp&&String(c.status||'').toLowerCase()!=='revoked';
    return json_({ok:true,verified,clientId:verified?c.clientId:'',projectId:verified?c.projectId:'',service:verified?c.service:''});
  }catch(err){ return json_({ok:false,verified:false,error:String(err.message||err)}); }
}
function createClientFromAdmin(client){
  requireAdmin_();
  return createClient_(client);
}

function createClient_(client){
  const c=client||{};
  const clientId=clean_(c.clientId), projectId=clean_(c.projectId), service=clean_(c.service);
  const whatsapp=normalizePhone_(c.whatsapp), email=clean_(c.email), status=clean_(c.status)||'Active';
  if(!clientId||!projectId||!service||!whatsapp||!email) throw new Error('Client ID, Project ID, Service, WhatsApp, and Email are required.');
  if(service!=='Identity'&&service!=='Website'&&service!=='Identity + Website') throw new Error('Invalid service.');
  const sheet=getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);
  ensureHeaders_(sheet,['Client ID','Project ID','Service','WhatsApp','Email','Token','Status','Last Submitted At']);
  const rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++){
    if(clean_(rows[i][0])===clientId) throw new Error('Client ID already exists.');
    if(clean_(rows[i][1])===projectId) throw new Error('Project ID already exists.');
  }
  const token=generateToken_();
  sheet.appendRow([clientId,projectId,service,whatsapp,email,token,status,'']);
  const base=String(CONFIG.SITE_BASE_URL||'').replace(/\/$/,'');
  const formPath=service==='Identity'?'form-identity':service==='Website'?'form-website':'form-identity-website';
  return {clientId,projectId,service,whatsapp,email,status,token,formUrl:base+'/'+formPath+'/?token='+encodeURIComponent(token)};
}
function doPost(e){
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(body.action==='createClient'){ requireAdmin_(); return json_({ok:true,client:createClient_(body.client)}); }
    const token=clean_(body.token), whatsapp=normalizePhone_(body.whatsapp), formType=clean_(body.formType), answers=body.answers||{};
    if(!token||!whatsapp||!formType) throw new Error('Missing required form metadata.');
    const c=findClientByToken_(token);
    if(!c||normalizePhone_(c.whatsapp)!==whatsapp||String(c.status||'').toLowerCase()==='revoked') return json_({ok:false,verified:false,error:'Verification failed.'});
    const sheetName=formType==='identity'?CONFIG.SHEETS.IDENTITY:formType==='website'?CONFIG.SHEETS.WEBSITE:formType==='identity-website'?CONFIG.SHEETS.BOTH:'';
    if(!sheetName) throw new Error('Unknown form type.');
    if(isTokenSubmitted_(token,sheetName)) return json_({ok:false,duplicate:true,error:'This form has already been submitted.'});
    const sheet=getOrCreateSheet_(sheetName);
    ensureHeaders_(sheet,['Timestamp','Client ID','Project ID','Service','WhatsApp','Email','Token','Answers JSON']);
    sheet.appendRow([new Date(),c.clientId,c.projectId,c.service,whatsapp,c.email,token,JSON.stringify(answers)]);
    markClientSubmission_(c.row);
    return json_({ok:true,submitted:true,clientId:c.clientId,projectId:c.projectId});
  }catch(err){ return json_({ok:false,error:String(err.message||err)}); }
}
function findClientByToken_(token){
  const sheet=getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);
  ensureHeaders_(sheet,['Client ID','Project ID','Service','WhatsApp','Email','Token','Status','Last Submitted At']);
  const values=sheet.getDataRange().getValues(); if(!values.length)return null;
  const headers=values.shift().map(String), idx=Object.fromEntries(headers.map((h,i)=>[h.trim(),i]));
  for(let r=0;r<values.length;r++){ const row=values[r]; if(clean_(row[idx['Token']])===token) return {row:r+2,clientId:row[idx['Client ID']],projectId:row[idx['Project ID']],service:row[idx['Service']],whatsapp:row[idx['WhatsApp']],email:row[idx['Email']],status:row[idx['Status']]}; }
  return null;
}
function isTokenSubmitted_(token,sheetName){ const v=getOrCreateSheet_(sheetName).getDataRange().getValues(); if(!v.length)return false; const i=v[0].map(String).indexOf('Token'); return i<0?false:v.slice(1).some(r=>clean_(r[i])===token); }
function markClientSubmission_(row){ const s=getOrCreateSheet_(CONFIG.SHEETS.CLIENTS); const headers=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String); const statusIndex=headers.indexOf('Status'); if(statusIndex>=0)s.getRange(row,statusIndex+1).setValue('Submitted'); const submittedIndex=headers.indexOf('Last Submitted At'); if(submittedIndex>=0)s.getRange(row,submittedIndex+1).setValue(new Date()); }
function generateToken_(){ return Utilities.getUuid().replace(/-/g,''); }
function getOrCreateSheet_(name){ const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); return ss.getSheetByName(name)||ss.insertSheet(name); }
function ensureHeaders_(s,h){ if(s.getLastRow()===0)s.getRange(1,1,1,h.length).setValues([h]); }
function normalizePhone_(v){ return clean_(v).replace(/[^\d+]/g,'').replace(/^00/,'+'); }
function clean_(v){ return String(v==null?'':v).trim(); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function requireAdmin_(){
  const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  const allowed=(CONFIG.ADMIN_EMAILS||[]).map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
  if(!email || allowed.indexOf(email)<0 || allowed.indexOf('replace_with_your_google_email')>=0) throw new Error('Admin access denied.');
}
