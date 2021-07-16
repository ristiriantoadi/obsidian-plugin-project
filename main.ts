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
					// lines[n] = "#"+lines[n];  
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

	async onload() {
		console.log('loading MY obsidian plugin');
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
