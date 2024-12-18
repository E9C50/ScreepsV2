```
system.resetAllData()
system.pauseSimulation()
system.resumeSimulation()

system.setTickDuration(1)

storage.db['rooms.objects'].find({'_id':'675f8b71c0196da2b8d4278f'})

storage.db['rooms.objects'].update({_id: 'cf030773144fccf'}, {$set: { level: 4 }})

storage.db['rooms.objects'].update({_id: '6760be019aa3409bde4bb715'}, {$set: { store: { energy: 5000 } }})

storage.db['rooms.objects'].find({ type: 'constructionSite' }).then(resp => resp.map(cs => storage.db['rooms.objects'].findOne({ _id: cs._id }).then(csDetail => storage.db['rooms.objects'].update({_id: cs._id }, {$set: { progress: csDetail.progressTotal - 1 }}))))
```

