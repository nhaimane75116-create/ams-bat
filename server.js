const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const fs=require('fs');
const path=require('path');

const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});

const PORT=process.env.PORT||3000;
const FICHIER_DB=path.join(__dirname,'db.json');

function chargerDB(){
if(!fs.existsSync(FICHIER_DB))return{missions:[],soustraitants:[],personnel:[],users:[
{id:'u1',nom:'Haimane',role:'Administrateur',pin:'0000',isAdmin:true},
{id:'u2',nom:'Shanaz',role:'Comptabilité',pin:'1111'},
{id:'u3',nom:'Fatima Zara',role:'Paiements',pin:'2222'},
{id:'u4',nom:'Miryem',role:'Coordination',pin:'3333'}
],config:{accessCode:'AMSBAT2026',nextMis:1,nextItv:1}};
try{return JSON.parse(fs.readFileSync(FICHIER_DB,'utf8'));}
catch(e){return{missions:[],soustraitants:[],personnel:[],users:[],config:{accessCode:'AMSBAT2026',nextMis:1,nextItv:1}};}
}

function sauverDB(d){
d.derniereMaj=new Date();
fs.writeFileSync(FICHIER_DB,JSON.stringify(d,null,2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

io.on('connection',(socket)=>{
console.log('Connecté:',socket.id);
const db=chargerDB();
socket.emit('init',db);

socket.on('mission:add',(m)=>{
const db=chargerDB();
if(!db.missions)db.missions=[];
db.missions.push(m);
if(!db.config)db.config={nextMis:1,nextItv:1};
db.config.nextMis=(db.config.nextMis||1)+1;
sauverDB(db);
io.emit('update',db);
});

socket.on('mission:update',({id,changes})=>{
const db=chargerDB();
const m=db.missions.find(x=>x.id===id);
if(m)Object.assign(m,changes);
sauverDB(db);
io.emit('update',db);
});

socket.on('mission:add-itv',({mId,itv})=>{
const db=chargerDB();
const m=db.missions.find(x=>x.id===mId);
if(m){
if(!m.itvs)m.itvs=[];
m.itvs.push(itv);
if(!db.config)db.config={nextItv:1};
db.config.nextItv=(db.config.nextItv||1)+1;
}
sauverDB(db);
io.emit('update',db);
});

socket.on('mission:add-ck',({mId,txt})=>{
const db=chargerDB();
const m=db.missions.find(x=>x.id===mId);
if(m){if(!m.checklist)m.checklist=[];m.checklist.push({txt,done:false});}
sauverDB(db);
io.emit('update',db);
});

socket.on('mission:toggle-ck',({mId,idx})=>{
const db=chargerDB();
const m=db.missions.find(x=>x.id===mId);
if(m&&m.checklist&&m.checklist[idx])m.checklist[idx].done=!m.checklist[idx].done;
sauverDB(db);
io.emit('update',db);
});

socket.on('equipe:add',({type,data})=>{
const db=chargerDB();
if(type==='st'){
if(!db.soustraitants)db.soustraitants=[];
db.soustraitants.push(data);
}else if(type==='per'){
if(!db.personnel)db.personnel=[];
db.personnel.push(data);
}
sauverDB(db);
io.emit('update',db);
});

socket.on('equipe:delete',({id,type})=>{
const db=chargerDB();
if(type==='st')db.soustraitants=db.soustraitants.filter(x=>x.id!==id);
else if(type==='per')db.personnel=db.personnel.filter(x=>x.id!==id);
sauverDB(db);
io.emit('update',db);
});

socket.on('user:add',(u)=>{
const db=chargerDB();
if(!db.users)db.users=[];
db.users.push(u);
sauverDB(db);
io.emit('update',db);
});

socket.on('user:update',({id,pin})=>{
const db=chargerDB();
const u=db.users.find(x=>x.id===id);
if(u)u.pin=pin;
sauverDB(db);
io.emit('update',db);
});

socket.on('user:delete',({id})=>{
const db=chargerDB();
db.users=db.users.filter(x=>x.id!==id);
sauverDB(db);
io.emit('update',db);
});

socket.on('config:update',(changes)=>{
const db=chargerDB();
if(!db.config)db.config={};
Object.assign(db.config,changes);
sauverDB(db);
io.emit('update',db);
});

socket.on('disconnect',()=>{
console.log('Déconnecté:',socket.id);
});
});

server.listen(PORT,()=>console.log('AMS BAT démarre sur http://localhost:'+PORT));
