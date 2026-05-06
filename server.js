const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const fs=require('fs');
const path=require('path');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});
const PORT=process.env.PORT||3000;
const DB_FILE=path.join(__dirname,'db.json');
function loadDB(){if(!fs.existsSync(DB_FILE))return{missions:[],soustraitants:[],personnel:[],users:[{id:'u1',nom:'Haimane',role:'Administrateur',pin:'0000',isAdmin:true},{id:'u2',nom:'Shanaz',role:'Comptabilite',pin:'1111'},{id:'u3',nom:'Fatima Zara',role:'Paiements',pin:'2222'},{id:'u4',nom:'Miryem',role:'Coordination',pin:'3333'}],config:{accessCode:'AMSBAT2026',nextMis:1,nextItv:1}};try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch(e){return{missions:[],soustraitants:[],personnel:[],users:[],config:{accessCode:'AMSBAT2026',nextMis:1,nextItv:1}};}}
function saveDB(d){fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));}
app.use(express.json());
app.use(express.static(__dirname));
io.on('connection',(socket)=>{
socket.emit('init',loadDB());
socket.on('mission:add',(m)=>{const d=loadDB();if(!d.missions)d.missions=[];d.missions.push(m);if(d.config)d.config.nextMis=(d.config.nextMis||1)+1;saveDB(d);io.emit('update',d);});
socket.on('mission:update',({id,changes})=>{const d=loadDB();const m=d.missions.find(x=>x.id===id);if(m)Object.assign(m,changes);saveDB(d);io.emit('update',d);});
socket.on('mission:add-itv',({mId,itv})=>{const d=loadDB();const m=d.missions.find(x=>x.id===mId);if(m){if(!m.itvs)m.itvs=[];m.itvs.push(itv);if(d.config)d.config.nextItv=(d.config.nextItv||1)+1;}saveDB(d);io.emit('update',d);});
socket.on('mission:add-ck',({mId,txt})=>{const d=loadDB();const m=d.missions.find(x=>x.id===mId);if(m){if(!m.checklist)m.checklist=[];m.checklist.push({txt,done:false});}saveDB(d);io.emit('update',d);});
socket.on('mission:toggle-ck',({mId,idx})=>{const d=loadDB();const m=d.missions.find(x=>x.id===mId);if(m&&m.checklist&&m.checklist[idx])m.checklist[idx].done=!m.checklist[idx].done;saveDB(d);io.emit('update',d);});
socket.on('mission:add-paiement',({mId,paiement})=>{const d=loadDB();const m=d.missions.find(x=>x.id===mId);if(m){if(!m.paiements)m.paiements=[];m.paiements.push(paiement);}saveDB(d);io.emit('update',d);});
socket.on('equipe:add',({type,data,update})=>{const d=loadDB();if(type==='st'){if(!d.soustraitants)d.soustraitants=[];if(update){const idx=d.soustraitants.findIndex(x=>x.id===data.id);if(idx>=0)d.soustraitants[idx]=data;else d.soustraitants.push(data);}else{d.soustraitants.push(data);}}else if(type==='per'){if(!d.personnel)d.personnel=[];if(update){const idx=d.personnel.findIndex(x=>x.id===data.id);if(idx>=0)d.personnel[idx]=data;else d.personnel.push(data);}else{d.personnel.push(data);}}saveDB(d);io.emit('update',d);});
socket.on('equipe:delete',({id,type})=>{const d=loadDB();if(type==='st')d.soustraitants=d.soustraitants.filter(x=>x.id!==id);else if(type==='per')d.personnel=d.personnel.filter(x=>x.id!==id);saveDB(d);io.emit('update',d);});
socket.on('user:add',(u)=>{const d=loadDB();if(!d.users)d.users=[];d.users.push(u);saveDB(d);io.emit('update',d);});
socket.on('user:update',({id,pin})=>{const d=loadDB();const u=d.users.find(x=>x.id===id);if(u)u.pin=pin;saveDB(d);io.emit('update',d);});
socket.on('user:delete',({id})=>{const d=loadDB();d.users=d.users.filter(x=>x.id!==id);saveDB(d);io.emit('update',d);});
socket.on('config:update',(changes)=>{const d=loadDB();if(!d.config)d.config={};Object.assign(d.config,changes);saveDB(d);io.emit('update',d);});
socket.on('disconnect',()=>{console.log('Disconnected:',socket.id);});
});
server.listen(PORT,()=>console.log('AMS BAT demarre sur http://localhost:'+PORT));
