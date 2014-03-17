//MAKE SURE TO CONFIGURE THESE:
var password = 'SET_THIS!';
var port = '8185';
//============================


var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var app = express();
var server = http.createServer(app);
var cp = require('child_process');
var exec = cp.exec;
var os = require('os');

var apps = [];
var consolelog = [];



try {
	var tempapps = JSON.parse(fs.readFileSync(__dirname + '/serverator_apps.json', 'utf8'));
	for (var i = 0; i < tempapps.length; i++) {
		apps.push(new child(tempapps[i].name, tempapps[i].filename, tempapps[i].appnum));
		if (tempapps[i].disabled){
			apps[apps.length - 1].disabled = true;
		} else {
			if (tempapps[i].running) {
				apps[apps.length - 1].start();
			};
			if (tempapps[i].restart) apps[apps.length - 1].restart = true;
			if (tempapps[i].watching) apps[apps.length - 1].watching = true;
		}
	};
} catch (err) {
	console.log('No saved apps found');
};


app.listen(port);
app.use(express.cookieParser());
app.use(express.bodyParser());

app.get('/', function (req, res) {
	fs.readFile(__dirname + '/serverator.html', function (err, data) {
		if (!err){
			html = data.toString('ascii');
			if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
				html = html.replace(/{filelist}/gi, JSON.stringify(getFileList(false, '')));
				res.send(html);
				return;
			} else {
				sendSplash(req, res);
				return;
			}
		} else {
			console.log('file not found');
		};
	});
});

app.get('/login/:password', function (req, res) {
	if (req.params && req.params.password){
		if (req.params.password == password){
			res.cookie('servlogin', { password: password }, { expires: new Date(new Date().getTime()+99396409000) });
		}
		setTimeout(function(){
			res.redirect('/');
		},300);
	} else {
		sendSplash(req, res);
	}
});

function getFileList(alpha, subdir){
	subdir = subdir.replace(/\./ig, '');
	if (subdir != '') subdir = '/' + subdir;
	//console.log(__dirname + subdir);
	var files = fs.readdirSync(__dirname + subdir);
	var tempfiles = [];
	for (var i = 0; i < files.length; i++) {
		if (files[i].toLowerCase().indexOf('serverator.js') == -1 && files[i].indexOf('DS_Store') == -1){
			tempfiles.push(files[i]);
		};
	};
	if (alpha){
		tempfiles.sort();
	} else {
		tempfiles.sort(function(a, b) {
			return fs.statSync(__dirname + subdir + '/' + b).mtime.getTime() - fs.statSync(__dirname + subdir + '/' + a).mtime.getTime();
		});
		for (var i = 0; i < tempfiles.length; i++) {
			if (tempfiles[i].indexOf('.') == -1 && fs.lstatSync(__dirname + subdir + '/' + tempfiles[i]).isDirectory()){
				tempfiles[i] = 'Folder: ' + tempfiles[i];
			}
		};
	}
	return tempfiles;
}

function getAppList(){
	var tempapps = [];
	for (var i = 0; i < apps.length; i++) {
		if (!apps[i].disabled){
			tempapps.push({
				name: apps[i].name,
				running: apps[i].running,
				appnum: apps[i].appnum,
				restart: apps[i].restart,
				watching: apps[i].watching,
			});
		}
	};
	return tempapps;
}

function saveAppList(){
	var tempapps = [];
	for (var i = 0; i < apps.length; i++) {
		tempapps.push({
			disabled: apps[i].disabled,
			name: apps[i].name,
			filename: apps[i].filename,
			running: apps[i].running,
			appnum: apps[i].appnum,
			restart: apps[i].restart,
			watching: apps[i].watching,
		});
	};
	fs.writeFileSync(__dirname + '/serverator_apps.json', JSON.stringify(tempapps));
}


app.post('/updateapp', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.body.appnum && req.body.action && req.body.appnum < apps.length){
			console.log(req.body.action + ' : ' + req.body.appnum);
			if (req.body.action == 'stop'){
				apps[req.body.appnum].stop();
				res.send({status: 202, message: ''});
			}
			if (req.body.action == 'start'){
				apps[req.body.appnum].start();
				res.send({status: 202, message: ''});
			}
			if (req.body.action == 'restart'){
				apps[req.body.appnum].restart = !apps[req.body.appnum].restart;
				res.send({status: 202, message: ''});
			}
			if (req.body.action == 'watching'){
				apps[req.body.appnum].watching = !apps[req.body.appnum].watching;
				res.send({status: 202, message: ''});
			}
			if (req.body.action == 'delete'){
				apps[req.body.appnum].stop();
				apps[req.body.appnum].restart = false;
				apps[req.body.appnum].watching = false;
				apps[req.body.appnum].disabled = true;
				res.send({status: 202, message: ''});
			}
			saveAppList();
		};
	} else {
		sendSplash(req, res);
		return;
	}
});


app.post('/runapp', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.body.filename && req.body.nickname){
			if (req.body.filename.indexOf('.js') == req.body.filename.length - 3){
				//check if file exists
				console.log(req.body.filename)
				console.log(__dirname + '/' + req.body.filename);
				if (fs.existsSync(__dirname + '/' + req.body.filename)){
					apps.push(new child(req.body.nickname, req.body.filename, apps.length));
					apps[apps.length - 1].start();
					res.send({status: 202, message: 'App starting'});
					saveAppList();
					return;
				} else {
					res.send({status: 506, error: 'File not found'});
					return;
				}
			} else {
				res.send({status: 506, error: 'App must be a .js file designed for Node.js'});
				return;
			}
		} else {
			res.send({status: 506, error: 'Specify app name'});
			return;
		}
	} else {
		sendSplash(req, res);
		return;
	}
});


app.post('/savefile', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.body.filepath && req.body.contents){
			if (fs.existsSync(__dirname + '/' + req.body.filepath)){
				fs.writeFileSync(__dirname + '/' + req.body.filepath, req.body.contents);
				res.send({status: 202, message: 'File saved'});
				return;
			} else {
				res.send({status: 506, error: 'File not found'});
				return;
			}
		} else {
			res.send({status: 505, error: 'Incorrect format' });
			return;
		}
	} else {
		sendSplash(req, res);
		return;
	}
});

app.post('/opendir', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (!req.body.dirname) req.body.dirname = '';
		var existingfiles = getFileList(false, req.body.dirname);
		res.send({status: 202, filelist: existingfiles });
		return;
	} else {
		sendSplash(req, res);
		return;
	}
});

app.post('/ping', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		res.send({
			status: 202,
			console: consolelog.join('<br />'),
			apps: getAppList(),
		});
	} else {
		sendSplash(req, res);
		return;
	}
});


app.post('/openfile', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.body.filename){
			var existingfiles = getFileList(true, (req.body.filepath ? req.body.filepath : ''));
			for (var i = 0; i < existingfiles.length; i++) {
				if (req.body.filename == existingfiles[i]){
					if (req.body.filename.toLowerCase().match(/\.(txt|css|html|js|json|rtf|md|less|jade|php|py|tsv|csv|xml)$/)){
						res.send({status: 202, file: fs.readFileSync(__dirname + '/' + (req.body.filepath ? req.body.filepath : '') + req.body.filename).toString('ascii') });
						return;
					} else {
						res.send({status: 506, error: 'Unsupported data type'});
						return;
					}
				}
			};
			res.send({status: 506, error: 'File not found' });
			return;
		} else {
			res.send({status: 506, error: 'Specify file name'});
			return;
		}
	} else {
		sendSplash(req, res);
		return;
	}
});


app.post('/newfile', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.body.filename){
			if (req.body.filename.indexOf('/') != -1){
				res.send({status: 506, error: 'File cannot contain slashes'});
				return;
			}
			var existingfiles = getFileList(true, (req.body.filepath ? req.body.filepath : ''));
			for (var i = 0; i < existingfiles.length; i++) {
				if (existingfiles[i] == req.body.filename){
					res.send({status: 506, error: 'File already exists'});
					return;
				}
			};
			fs.closeSync(fs.openSync(__dirname + '/' + (req.body.filepath ? req.body.filepath : '') + req.body.filename, 'w'));
			existingfiles = getFileList(false, (req.body.filepath ? req.body.filepath : ''));
			res.send({status: 202, filelist: existingfiles });
		} else {
			res.send({status: 506, error: 'Specify file name'});
			return;
		}
	} else {
		sendSplash(req, res);
		return;
	}
});

setInterval(function(){
	consoleLog('ram: ' + parseInt(os.freemem()) / parseInt(os.totalmem()) + ' \n load: ' + os.loadavg());
},120000);


function consoleLog(text){
	consolelog.push(text.replace(/\n/ig, '<br />'));
	if (consolelog.length > 500){
		consolelog.splice(0, consolelog.length - 500);
	};
}

//removed for security reasons, but could easily be set back up
/*
app.post('/uploadfile', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		if (req.files && req.files.imageupload && req.files.imageupload.name){
			var tempfilename = (new Date()).getTime() + '_' + req.files.imageupload.name.replace(/\s/g, '-');
			fs.rename(req.files.imageupload.path, __dirname + '/serverator_static/uploads/' + tempfilename, function(err) {
				if (err) throw err;
				res.send({status: 202, message: tempfilename});
				return;
			});
		} else {
			res.send({status: 506, error: 'invalid image type'});
			return;
		}
	} else {
		sendSplash(req, res);
		return;
	}
});
app.post('/npminstall', function(req, res){
	if (req.cookies && req.cookies.servlogin && req.cookies.servlogin.password && req.cookies.servlogin.password == password){
		child = exec('npm install ' + (req.body.npm ? req.body.npm : ''), function (error, stdout, stderr) {
			console.log('stdout: ' + stdout);
			consoleLog(stdout);
			console.log('stderr: ' + stderr);
			consoleLog(stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
				consoleLog('exec error: ' + error);
			}
		});
	} else {
		sendSplash(req, res);
		return;
	}
});
*/


function sendSplash(req, res){
	res.send('Password: <input id="password" type="password" placeholder="password" /> <button onclick="window.location=\'/login/\' + document.getElementById(\'password\').value">Login</button>')
}



function child(name, filename, appnum){
	this.name = name;
	this.filename = filename;
	this.running = false;
	this.appnum = appnum;
	this.process;
	this.restart = false;
	this.watching = false;
	this.lastrestart = 0;
	this.disabled = false;

	this.stop = function(){
		this.running = false;
		this.process.kill('SIGINT');
		console.log(this.name + ' quitting')
		consoleLog(this.name + ' quitting');
	}
	this.restart = function(){
		if (this.running) {
			this.process.kill('SIGINT');
		} else {
			this.start();
		}
	}
	this.start = function(){
		if (this.running) {
			this.process.kill('SIGINT');
			return;
		};
		this.process = cp.fork(__dirname + '/' + this.filename, {silent:true});
		console.log(this.name + ' starting');
		consoleLog(this.name + ' starting');
		this.running = true;
		var parent = this;

		fs.watchFile(__dirname + '/' + this.filename, function (curr, prev) {
			if (parent.running && parent.watching){
				console.log(parent.name + ' changed, restarting');
				consoleLog(parent.name + ' changed, restarting');
				parent.start();
			};
		});

		this.process.stderr.on('data', function (data) {
			if (data.toString('utf8').indexOf('Cannot find module') != -1){
				console.log('File not found');
				consoleLog('File not found');
				parent.running = false;
			} else {
				console.log('\033[31m' + parent.name + ': ' + data + '\033[0m');
				consoleLog(parent.name + ': ' + data);
			};
		});

		this.process.stdout.on('data', function (data) {
			console.log('\033[36m' + parent.name + ':\033[0m ' + data);
			consoleLog(parent.name + ': ' + data);
		});

		this.process.on('exit', function (code) {
			console.log('\033[31m' + parent.name + ' stopped.\033[0m');
			consoleLog(parent.name + ' stopped');
			
			if (parent.restart && parent.running) {
				parent.running = false;
				if ((new Date()).getTime() - parent.lastrestart < 5000){
					console.log('ERROR: ' + parent.name + ' stopped too quickly since last stop, not attempting to restart');
					consoleLog('ERROR: ' + parent.name + ' stopped too quickly since last stop, not attempting to restart');
				} else {
					parent.start();
				}
				parent.lastrestart = (new Date()).getTime();
			};
		});
	}
}

//Some optional stuff:
/*
setInterval(function(){
	fs.writeFileSync(__dirname + '/serverator_log_' + (new Date()).getTime() + '.txt', consolelog.join('\n'));
	consolelog = [];
}, 3600000)

process.stdin.resume();//so the program will not close instantly
process.on('exit', function (){
	exitApp();
});
process.on('SIGINT', function () {
	exitApp();
});

function exitApp(){
	console.log('Quitting serverator');
	//todo go through every child and quit it
	process.exit();
}
*/
