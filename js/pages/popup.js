console.log("popup");

var config,_OS,devMode;
var sup={
	init:function(){
		console.log(config);
		sup.initUI();
		sup.initI18n();
		window.addEventListener("click",this.handleEvent,false);
		window.addEventListener("change",this.handleEvent,false);
	},
	handleEvent:function(e){
		switch(e.type){
			case"click":
				if(e.target.dataset.menu==="options"){
					chrome.tabs.create({url:"../html/options.html"},function(tabs){
						window.close();
					});
				}
				if(e.target.dataset.menu==="action"){
					sup.action(e.target.querySelector("select").value);
				}
				if(e.target.dataset.menu==="action_span"){
					sup.action(e.target.parentNode.querySelector("select").value);
				}
				if(e.target.dataset.menu==="about"){
					// chrome.storage.local.get(function(items){
					// 	items.showabout=true;
					// 	chrome.storage.local.set(items,function(){
					// 		chrome.tabs.create({url:"../html/options.html"});
					// 		window.close();
					// 	})
					// })
					localStorage.setItem("showabout","true");
					chrome.tabs.create({url:"../html/options.html"},function(tabs){
						window.close();
					});
				}
				//window.close();
				break;
			case"change":
				console.log(e.target.value)
				if(e.target.classList.contains("action_select")){
					sup.action(e.target.value);
					// chrome.runtime.sendMessage({type:"action_pop",popvalue:config.pop.settings[parseInt(e.target.value)]},function(response){})
					// window.close();
				}
				break;
		}
	},
	action:function(index){
		chrome.runtime.sendMessage({type:"action_pop",index:parseInt(index,10)},function(response){})
		window.close();
	},
	initUI:function(){
		var dom,_config,newdom,i;
		if(!config.general.fnswitch.fnpop){
			document.querySelector("[data-menu=action]").style.cssText+="display:none;";
			document.querySelector(".menu_line").style.cssText+="display:none;";
		}else{
			dom=document.querySelector("[data-menu=action]>select");
			_config=config.pop.actions;
			for(i=0;i<_config.length;i++){
				newdom=document.createElement("option");
				newdom.innerText=_config[i].mydes?_config[i].mydes.value:sup.getI18n(_config[i].name);
				newdom.value=i//_config[i].name;
				newdom.dataset.id=i;
				dom.appendChild(newdom);
			}
		}
	},
	initI18n:function(){
		var i;
		var trans;
		var i18nOBJ=document.querySelectorAll("[data-i18n]");
		for(i=0;i<i18nOBJ.length;i++){
			trans=sup.getI18n(i18nOBJ[i].dataset.i18n);
			if(!trans){continue;}
			if(i18nOBJ[i].tagName.toLowerCase()==="input"&&i18nOBJ[i].type==="button"){
				i18nOBJ[i].value=trans;
			}else if(i18nOBJ[i].title==="_i18n"){
				i18nOBJ[i].title=trans;
			}else{
				i18nOBJ[i].textContent=trans;
			}
		}
	},
	getI18n:function(str){
		//console.log(str)
		return chrome.i18n.getMessage(str)||str;
	},
}
chrome.runtime.sendMessage({type:"pop_getconf"},function(response){
	if(response){
		console.log(response)
		config=response.config;
		_OS=response.os;
		devMode=response.devMode;
		sup.init();
	}
})
