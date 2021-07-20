import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CursorPos } from 'readline';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	cm:CodeMirror.Editor

	countHastags(line:String){
		var count=0;
		for(var i = 0;i<line.length;i++){
			if(line[i] == "#"){
				count++;
			}else{
				break;
			}
		}
		return count;
	}

	async writeChange(lines:String[]){
		var newContent=""
		for(var n=0;n<lines.length;n++){
			newContent+=lines[n]+"\n";
		}
		var data = newContent;
		const leaf = this.app.workspace.activeLeaf;
		if(!leaf)
			return;
		const currentView = leaf.view as MarkdownView;
		const currentFile = currentView.file;
		await this.app.vault.modify(currentFile,data)
	}

	async increaseHeading(){
		const start = this.cm.getCursor("from");
		const end = this.cm.getCursor("to");
		var data = this.cm.getValue();
		var lines = data.split("\n");
		for(var n = start.line;n<=end.line;n++){
			if(lines[n].startsWith("#")){
				//count the number of '#'
				const numberOfHastags = this.countHastags(lines[n]);
				if(numberOfHastags < 6){
					lines[n] = "#"+lines[n];  
				}else{
					new Notice('Max heading reached!');
					return;
				}
			}
		}

		//write the change and set selection
		await this.writeChange(lines);
		end.ch+=1;
		this.cm.setSelection(start,end)
	}

	async decreaseHeading(){
		const start = this.cm.getCursor("from");
		const end = this.cm.getCursor("to");
		var data = this.cm.getValue();
		var lines = data.split("\n");
		for(var n = start.line;n<=end.line;n++){
			if(lines[n].startsWith("#")){
				//count the number of '#'
				const numberOfHastags = this.countHastags(lines[n]);
				if(numberOfHastags > 1){
					lines[n] = lines[n].replace("#", "");  
				}else{
					new Notice('Min heading reached!');
					return;
				}
			}
		}

		//write the change and set selection
		await this.writeChange(lines);
		end.ch-=1;
		this.cm.setSelection(start,end)
	}

	generateHashtags(hashtagsNum:number){
		var hashtags = ""; 
		for(var n = 0;n<hashtagsNum;n++){
			hashtags+="#";
		}
		return hashtags;
	}

	getTodayDate(){
		var d = new Date(),
		month = '' + (d.getMonth() + 1),
		date = '' + d.getDate(),
		year = d.getFullYear();
		var day;
		if(d.getDay() == 1){
			day = "senin"
		}else if(d.getDay() == 2){
			day = "selasa";
		}else if(d.getDay() == 3){
			day = "rabu";
		}else if (d.getDay() == 4){
			day = "kamis";
		}else if(d.getDay() == 5){
			day = "jumat";
		}else if (d.getDay() == 6){
			day = "sabtu"
		}else{
			day = "minggu";
		}
		
		if (month.length < 2) 
			month = '0' + month;
		if (date.length < 2) 
			date = '0' + date;
		var currentDate=[year, month, date].join('-')+" "+day;
		return currentDate;
	}

	writeDownScratchpad(scratchpad:string,hashtags:string,newContent:string[]):string[]{
		// write down the scratchpad
		newContent.push(scratchpad)
				
		//write down the current date
		hashtags+="#";
		var d = new Date(),
		month = '' + (d.getMonth() + 1),
		date = '' + d.getDate(),
		year = d.getFullYear();
		var day;
		if(d.getDay() == 1){
			day = "senin"
		}else if(d.getDay() == 2){
			day = "selasa";
		}else if(d.getDay() == 3){
			day = "rabu";
		}else if (d.getDay() == 4){
			day = "kamis";
		}else if(d.getDay() == 5){
			day = "jumat";
		}else if (d.getDay() == 6){
			day = "sabtu"
		}else{
			day = "minggu";
		}
		
		if (month.length < 2) 
			month = '0' + month;
		if (date.length < 2) 
			date = '0' + date;
		var currentDate=[year, month, date].join('-')+" "+day;
		currentDate =  hashtags+" "+currentDate
		newContent.push(currentDate)

		return newContent
	}

	isCursorInScratchpad(current:CodeMirror.Position){
		var line = current.line
		var data = this.cm.getValue();
		var lines = data.split("\n");
		for(var n = line;n>=0;n--){
			if(lines[n].startsWith("#")){
				// if it match a scratchpad, then it must have been inside scratchpad
				if(lines[n].match(/(#)+ (scratchpad \/|first scratchpad)/i)){
					return true;
				}
				// if it match a day section, then it MIGHT be inside scratchpad (but not always), so continue searching
				// upward
				else if(lines[n].match(/(#)+ [0-9]{4}-[0-9]{2}-[0-9]{2}/)){
					continue;
				}
				// if it doesnt match a scratchpad, or a day section, then it must be a regular section
				// therefore, it must NOT BE inside scratchpad
				else{
					return false;
				}

			}
		}
		return false;
	}

	async createScratchpad(){
		// identify the parent
		var data = this.cm.getValue();
		var lines = data.split("\n");
		var parentHeading = 0;
		var parentLine = -1;
		var parentName="";
		const current = this.cm.getCursor();
		for(var n = current.line;n>=0;n--){
			if(lines[n].startsWith("#")){
				//this is the parent
				parentHeading = this.countHastags(lines[n]);
				parentLine = n;
				parentName = lines[n].replace(/#+ /m,"")
				break;
			}
		}

		// check if cursor is currently inside scratchpad
		if(this.isCursorInScratchpad(current)){
			new Notice("cant create scratchpad for scratchpad")
			return;
		}

		// find the end of the section
		var endSectionLine = lines.length;
		for (var n = parentLine+1;n<lines.length;n++){
			if(lines[n].startsWith("#")){
				if(this.countHastags(lines[n]) <= parentHeading){
					endSectionLine = n;
					break;
				}
			}
		}

		// check whether or not scratchpad already exist
		for(var n = parentLine+1;n<endSectionLine;n++){
			if(lines[n].match(/(#)+ (scratchpad \/|first scratchpad)/i)){
				new Notice("Scratchpad already exist");
				return;
			}
		}


		// write out the scratchpad
		var hashtags = this.generateHashtags(parentHeading+1)
		var scratchpad = hashtags+" First Scratchpad"
		if(parentName != "")
			var scratchpad = hashtags+" scratchpad / "+parentName+ " scratchpad"
		var newContent:string[] = [];
		for(var n = 0;n<lines.length;n++){
			if(n == endSectionLine){
				newContent = this.writeDownScratchpad(scratchpad,hashtags,newContent)
			}
			newContent.push(lines[n]);
		}

		// if end of section is at the end of page
		if(endSectionLine == lines.length){
			newContent = this.writeDownScratchpad(scratchpad,hashtags,newContent)
		}

		await this.writeChange(newContent)
		this.cm.setCursor(current)
		this.createEol()
		// current.line = endSectionLine
		// this.cm.setCursor(current)
	}

	// list headings
	async listHeadings(){
		console.log("list headings called");

		// identify the parent
		var data = this.cm.getValue();
		var lines = data.split("\n");
		var parentHeading = 0;
		var parentLine = -1;
		const current = this.cm.getCursor();
		for(var n = current.line;n>=0;n--){
			if(lines[n].startsWith("#")){
				if(n == current.line){
					new Notice("Put the cursor on a non-heading line");
					return;
				}
				//this is the parent
				parentHeading = this.countHastags(lines[n]);
				parentLine = n;
				break;
			}
		}

		//from the parentLine+1 until it met a heading <= of the parent heading
		// OR, it met the end of the page.
		var headings = [];
		for (var n = parentLine+1;n<lines.length;n++){
			if(lines[n].startsWith("#")){
				var heading = this.countHastags(lines[n])
				if(heading <= parentHeading){
					break;
				}
			
				if(heading-parentHeading == 1){
					headings.push(lines[n]);
				}
			}
		}

		var newContent=[];
		for(var n = 0;n<lines.length;n++){
			if(n == current.line){
				// write down the list of headings
				for(var i =0;i<headings.length;i++){
					// strip headings[i] of its hashtags and then push to the content
					headings[i] = headings[i].replace(/#+ /m,"")
					newContent.push(`- ${headings[i]}`)
				}
			}
			newContent.push(lines[n]);
		}
		
		await this.writeChange(newContent)
		this.cm.setCursor(current)
	}

	async addTodaySection(){
		// find parent
		// identify the parent
		var data = this.cm.getValue();
		var lines = data.split("\n");
		var parentHeading = 0;
		var parentLine = -1;
		const current = this.cm.getCursor();
		for(var n = current.line;n>=0;n--){
			if(lines[n].startsWith("#")){
				if(n == current.line){
					new Notice("Put the cursor on a non-heading line");
					return;
				}
				//this is the parent
				parentHeading = this.countHastags(lines[n]);
				parentLine = n;
				break;
			}
		}

		var todaySection = this.generateHashtags(parentHeading+1)+" "+this.getTodayDate();
		
		var newContent=[];
		for(var n = 0;n<lines.length;n++){
			if(n == current.line){
				newContent.push(todaySection);
			}
			newContent.push(lines[n]);
		}
		
		await this.writeChange(newContent)
		this.cm.setCursor(current)
	}

	async createEol(){
		// find parent
		// identify the parent
		var data = this.cm.getValue();
		var lines = data.split("\n");
		var parentHeading = 0;
		var parentLine = -1;
		var parentName="";
		const current = this.cm.getCursor();
		for(var n = current.line;n>=0;n--){
			if(lines[n].startsWith("#")){
				//this is the parent
				parentHeading = this.countHastags(lines[n]);
				parentLine = n;
				parentName = lines[n].replace(/#+ /m,"")
				break;
			}
		}

		// check if it's inside scratchpad
		if(!this.isCursorInScratchpad(current)){
			// find the scratchpad section
			var endSectionLine = lines.length;
			var scratchpadExist=false;
			for (var n = parentLine+1;n<lines.length;n++){
				if(lines[n].match(/(#)+ (scratchpad \/|first scratchpad)/i)){
					scratchpadExist=true;
				}
				
				if(lines[n].startsWith("#")){
					if(this.countHastags(lines[n]) <= parentHeading){
						endSectionLine = n;
						break;
					}
				}
			}

			if(!scratchpadExist){
				new Notice("Create scratchpad first");
				return;
			}
			
			// write out the eol
			var eol = "**first eol**";
			if(parentName != "")
				eol = "**"+parentName+" eol**";
			var newContent:string[] = [];
			for(var n = 0;n<lines.length;n++){
				if(n == endSectionLine){
					newContent.push(eol);
				}
				newContent.push(lines[n]);
			}

			// if end of section is at the end of page
			if(endSectionLine == lines.length){
				newContent.push(eol);
			}

			await this.writeChange(newContent)
			current.line = endSectionLine
			this.cm.setCursor(current)
		}else{
			new Notice("cant create eol for scratchpad");
			return;
		}
	}

	async onload() {
		console.log('loading MY obsidian plugin');

		this.createEol = this.createEol.bind(this)
		this.addCommand({
			id: 'create-eol',
			name: 'Create EOL',
			callback: this.createEol,
		});

		this.addTodaySection = this.addTodaySection.bind(this)
		this.addCommand({
			id: 'add-today-section',
			name: 'Add today section',
			callback: this.addTodaySection,
		});

		this.increaseHeading = this.increaseHeading.bind(this)
		this.addCommand({
			id: 'increase-heading',
			name: 'Increase Heading Number',
			callback: this.increaseHeading,
			hotkeys: [
				{
				  modifiers: ["Shift"],
				  key: "+",
				},
			],
		});

		this.decreaseHeading = this.decreaseHeading.bind(this)
		this.addCommand({
			id: 'decrease-heading',
			name: 'Decrease Heading Number',
			callback: this.decreaseHeading,
			hotkeys: [
				{
				  modifiers: ["Shift"],
				  key: "-",
				},
			]
		});

		this.listHeadings = this.listHeadings.bind(this)
		this.addCommand({
			id: 'list-headings',
			name: 'List headings of a section',
			callback: this.listHeadings,
		});

		this.createScratchpad = this.createScratchpad.bind(this)
		this.addCommand({
			id: 'create-scratchpad',
			name: 'Create Scratchpad',
			callback: this.createScratchpad,
		});

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
			this.cm = cm;
		});
	}

	onunload() {
		console.log('unloading MY obsidian plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
