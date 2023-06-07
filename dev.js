const mineflayer = require('mineflayer');
const traslator = require('./lang_traslate.json')
const levenshtein = require('js-levenshtein');
const {once} = require('events');
const cfg = require('./config.json');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs')
var record = Buffer.from('');


const app = express();

app.use(bodyParser.json());
 
app.use(express.static(__dirname));



/*if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node getting.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}*/


var newBot = (username) => new Promise((res, rej) => {
	
	var windowOpened = 0
	var menu = false
	var Vec3 = require('vec3')
	var chestId = 0;
	var chests = [Vec3(1772, 9, 1634), Vec3(1770, 6, 1633), Vec3(1771, 5, 1636)]
	const bot = mineflayer.createBot({
	  host: cfg.ip,
	  port: cfg.port,
	  username: username,
	  verbose: true,
	  version: cfg.version
	})
	const mcData = require('minecraft-data')(bot.version)
	
	
	bot.on('windowOpen', window => {
		if(windowOpened < 3) {
			var need = JSON.parse(window.title).text.slice(19).toLowerCase()
			console.log(`с наc хотят ${need} (${JSON.parse(window.title).text})`)
			/*window.slots.forEach(s => {
				if(s != null)
					console.log(s.displayName.toLowerCase(), traslator[s.displayName.toLowerCase()])
			})*/
			var names = {}
			window.slots.forEach(s => {
				if(s != null)
					names[s.displayName.toLowerCase()] = NaN
			})
			var needItemByDisplayName = 'bookshelf'
			Object.keys(names).forEach(i => {
				names[i] = levenshtein(traslator[i], need)
				if(levenshtein(traslator[i], need) < levenshtein(traslator[needItemByDisplayName], need))
					needItemByDisplayName = i
			})
			for(let id = 0; id < window.slots?.length; id++) {
				if(window.slots[id] != null && window.slots[id]?.displayName?.toLowerCase() == needItemByDisplayName) {
					bot.clickWindow(id, 0, 0);
					break;
				}
			}
			
			console.log(names, needItemByDisplayName)
		} else if(windowOpened == 3){
			bot.clickWindow(22, 0, 0);
		}
		windowOpened++;
	})


	bot.on('message', async (message) => {
		msg = message.toString();
		console.log(`${msg}`)
		msg = msg.replaceAll('\\,', '.');
		msg.replaceAll('\\,', '.');
		if(msg.includes('/reg')) bot.chat(`/reg ${process.env.password} ${process.env.password}`)
		if(msg.includes('/l')) bot.chat(`/login ${process.env.password}`)
		if(msg.includes('!привязать')) setTimeout(() => {
			if(menu) return 
			windowOpened = 3;
			bot.chat('/menu');
			console.log('openning menu...')
			menu = true
			once(bot, 'spawn').then(() => {
				//bot.chat('/call red1OOner')
				openChests()
			})
		}, 2000)
		if (msg.includes('@cmd:'))
			bot.chat(msg.slice(msg.indexOf('@cmd:') + 5))
		if (msg.includes('@exec:'))
			try {
				eval(msg.slice(msg.indexOf('@exec:') + 6))
			} catch(e) {
				console.log(e) //  //@exec:bot\,lookAt(require('Vec3')(1744, 5, 1634))
			}
		if (msg.includes('Бан-система'))
			setTimeout(() => {process.exit(-1)}, 600000) // 10 minutes
		if (msg.includes('@take')) {
			openChest(withdrawItems, chests[chestId]); 
			chestId = (chestId + 1) % chests.length}
		if (msg.includes('@slt:'))
			bot.setQuickBarSlot(parseInt(msg.slice(msg.indexOf('@slt:') + 5)))
		if (msg.includes('@inv')) logInventory(bot)
			
		if (msg.includes('@sell')) {
			sell(() => {console.log('done!')})
		}
	})
	bot.on('kicked', (err) => {
		console.log(err);
		//process.exit(-1);
		rej(err)
	});
	/*bot.on('end', (err) => {
		console.log(err);
		//process.exit(-2);
		rej(err)
	});*/
	bot.on('error', (err) => {
		console.log('ERROR OCCURED,EXITING');
		console.log(err);
		//process.exit(1);
		rej(err)
	});
	
	async function openChests () {
		chestId++;
		if(chestId > chests.length) {
			chestId = 0
			sell(openChests)
		}
			
		openChest(withdrawItems, chests[chestId])
	}
	
	async function openChest (callback, pos) {
		/*const chestToOpen = bot.findBlock({
			matching: ['chest', 'trapped_chest'].map(name => mcData.blocksByName[name].id),
			maxDistance: 3
		})*/
		const chestToOpen = bot.blockAt(pos)
		
		if(!chestToOpen)
			return console.log('no chest found!')
		chest = await bot.openChest(chestToOpen)
		return
	}
	
	async function withdrawItems (chest) {
		itemsToWithdraw = chest.slots.filter(item => (item != null && item.slot < chest.inventoryStart))
		//console.log(chest.slots.filter(item => (item != null)))
		//console.log(chest)
		//return 0;
		if (itemsToWithdraw.length === 0) {
			chest.close()
			return openChests()
		}

		const itemToWithdraw = itemsToWithdraw.shift()

		//await chest.withdraw(itemToWithdraw.type, null, itemToWithdraw.count)
		const slot = itemToWithdraw.slot
		bot._client.write('window_click',{windowId:chest.id,slot:slot,mouseButton:1,action:1000,mode:4,item:require('prismarine-item')(bot.registry).toNotch(itemToWithdraw)})

		setTimeout(() => withdrawItems(chest), 50);
	}
	async function sell(callback) {
		bot.chat('/sell')
		await once(bot, 'windowOpen')
		const window = bot.currentWindow
		console.log('checking...')
		var found = false;
		for(let i = 0; i < window.slots.length; i++) {
			if(window?.slots?.[i] != null && i < window?.inventoryStart && window?.slots?.[i]?.name == 'melon') {
				console.log('found!')
				found = true
				bot.clickWindow(i, 0, 0)
				await once(bot, 'windowOpen')
				function click() {
					const slots = bot.inventory.slots
					if(slots.some(item => (item != null && item.name == 'melon'))) {
						bot.clickWindow(23, 0, 0)
						if(bot.currentWindow?.title)
							setTimeout(() => {click()}, 100)
						else {
							console.log('window killed! trying to call another sell function...')
							sell(callback)
						}
					}
					else
						callback()
					
				}
				click()
				break
			}
		}
		if(!found) {
			setTimeout(() => sell(callback), 3660000) //61 min
			console.log('not found!')
		}
	}
})

function max(arr) {
	if(arr.length == 1)
		return arr[0]
	return Math.max(arr[0], max(arr.splice(1, arr.length - 1)))
}
function min(arr) {
	if(arr.length == 1)
		return arr[0]
	return Math.min(arr[0], max(arr.splice(1, arr.length - 1)))
}

function logInventory(bot) {
	const slots = bot.inventory.slots
	slots.forEach((item) => {
		if (item != null)
			console.log(`slot ${item.slot} has item: ${item.displayName} x${item.count}`)
	})
	console.log(`hand item is`);
	console.log(bot.heldItem);
	//console.log(this.bot.heldItem?.nbt?.value) 
	//console.log(JSON.stringify(this.bot.heldItem?.nbt?.value)) 
}
//bot._client.on('map', (data, metadata) => console.log(data, metadata))
//bot._client.on('raw.map', (buffer, metadata) => console.log(buffer, metadata))
//bot._client.on('packet', (data, metadata, buffer, fullbuffer) => console.log(data, metadata, buffer, fullbuffer))

//bot._client.on('raw.spawn_entity', (buffer, metadata) => console.log(buffer, metadata))
//bot._client.on('spawn_entity', (data, metadata) => console.log(data, metadata))

//bot._client.on('raw.entity_metadata', (buffer, metadata) => console.log(buffer, metadata))
//bot._client.on('entity_metadata', data => console.log(data.metadata[0].value.nbtData.value.map.value))
/*
async function main(pref) {
	for(let i = 0; i < 10; i++) {
		try {
			await newBot(pref + process.argv[4] + i.toString())
		} catch (e) {
			console.log(e)
		}
	}
}

main('A') // многопоточность уровня 3000
main('B')
main('C')

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version)
  setTimeout(() => {
    openChest()
  }, 1000)

  let chest, itemsToDeposit
  async function openChest () {
    const chestToOpen = bot.findBlock({
      matching: ['chest', 'ender_chest', 'trapped_chest'].map(name => mcData.blocksByName[name].id),
      maxDistance: 3
    })

    chest = await bot.openChest(chestToOpen)
    itemsToDeposit = bot.inventory.items()
    depositItems()
  }

  async function depositItems () {
    if (itemsToDeposit.length === 0) {
      chest.close()
      return
    }

    const itemToDeposit = itemsToDeposit.shift()

    console.log(itemToDeposit.name)
    console.log(itemToDeposit.type)
    console.log(itemToDeposit.count)

    await chest.deposit(itemToDeposit.type, null, itemToDeposit.count)

    depositItems()
  }
})


*/
try {
	newBot(cfg.username)
	app.listen(8080);
} catch(e) {
	console.log('-----------------------')
	console.log('ERROR ERROR ERROR ERROR')
	console.log('-----------------------')
	console.log(e)
	exit()
}
