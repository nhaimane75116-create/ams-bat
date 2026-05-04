const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});
const PORT=process.env.PORT||3000;
const DB_FILE=path.join(__dirname,'db.json');
const ACCESS_CODE='AMSBAT2026';
const COLS=['#128c7e','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899'];
function todayStr(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')}
function loadDB(){if(!fs.existsSync(DB_FILE)){const i={missions:[],soustraitants:[],counters:{},lastUpdate:Date.now()};fs.writeFileSync(DB_FILE,JSON.stringify(i));return i}return JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}
function saveDB(d){d.lastUpdate=Date.now();fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2))}
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
io.use((socket,next)=>{socket.handshake.auth.code===ACCESS_CODE?next():next(new Error('Code invalide'))});
io.on('connection',(socket)=>{
console.log('Connecte:',socket.id);
socket.emit('full-sync',loadDB());
socket.on('mission:create',(p)=>{const db=loadDB();const k='MIS-'+todayStr();db.counters[k]=(db.counters[k]||0)+1;p.numMission=todayStr()+'-'+String(db.counters[k]).padStart(3,'0');p.id=crypto.randomUUID();p.createdAt=new Date().toISOString();db.missions.unshift(p);saveDB(db);io.emit('full-sync',db)});
socket.on('mission:update',({id,changes})=>{const db=loadDB();const i=db.missions.findIndex(m=>m.id===id);if(i!==-1){db.missions[i]={...db.missions[i],...changes};saveDB(db);io.emit('full-sync',db)}});
socket.on('mission:delete',({id})=>{const db=loadDB();db.missions=db.missions.filter(m=>m.id!==id);saveDB(db);io.emit('full-sync',db)});
socket.on('mission:checklist-toggle',({missionId,ckIdx})=>{const db=loadDB();const m=db.missions.find(m=>m.id===missionId);if(m&&m.checklist[ckIdx]){m.checklist[ckIdx].done=!m.checklist[ckIdx].done;const done=m.checklist.filter(c=>c.done).length;if(m.checklist.length>0)m.prog=Math.min(90,Math.round(done/m.checklist.length*80)+10);saveDB(db);io.emit('full-sync',db)}});
socket.on('mission:payer',({id})=>{const db=loadDB();const m=db.missions.find(m=>m.id===id);if(m){m.stat='payee';m.prog=100;m.itvs.forEach(i=>i.paye=true);const k='FAC-'+todayStr();db.counters[k]=(db.counters[k]||0)+1;m.facture=todayStr()+'-'+String(db.counters[k]).padStart(3,'0');m.paystat='paye';saveDB(db);io.emit('full-sync',db)}});
socket.on('mission:docs-update',({id,devis,devismnt,facture,paystat})=>{const db=loadDB();const m=db.missions.find(m=>m.id===id);if(m){if(devis!==undefined)m.devis=devis;if(devismnt!==undefined)m.devismnt=devismnt;if(facture!==undefined){if(!facture){const k='FAC-'+todayStr();db.counters[k]=(db.counters[k]||0)+1;m.facture=todayStr()+'-'+String(db.counters[k]).padStart(3,'0')}else{m.facture=facture}}if(paystat!==undefined)m.paystat=paystat;saveDB(db);io.emit('full-sync',db)}});
socket.on('st:create',(p)=>{const db=loadDB();p.id=crypto.randomUUID();p.col=COLS[db.soustraitants.length%COLS.length];db.soustraitants.push(p);saveDB(db);io.emit('full-sync',db)});
socket.on('st:delete',({nom})=>{const db=loadDB();db.soustraitants=db.soustraitants.filter(s=>s.nom!==nom);saveDB(db);io.emit('full-sync',db)});
socket.on('disconnect',()=>console.log('Deconnecte:',socket.id));
});
server.listen(PORT,()=>console.log('AMS BAT demarre sur http://localhost:'+PORT));
