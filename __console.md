```
system.resetAllData()
system.pauseSimulation()
system.resumeSimulation()

system.setTickDuration(1)

storage.db['rooms.objects'].find({'_id':'675f8b71c0196da2b8d4278f'})

storage.db['rooms.objects'].update({_id: '813c077261d02ea'}, {$set: { level: 3 }})

storage.db['rooms.objects'].update({_id: '6760be019aa3409bde4bb715'}, {$set: { store: { energy: 5000 } }})

storage.db['rooms.objects'].find({ type: 'constructionSite' }).then(resp => resp.map(cs => storage.db['rooms.objects'].findOne({ _id: cs._id }).then(csDetail => storage.db['rooms.objects'].update({_id: cs._id }, {$set: { progress: csDetail.progressTotal - 1 }}))))
```


```
Game.spawns['Spawn2'].spawnCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL], 'npcHouseKeeper1', { memory: {role: 'dismantler'} });
```