// SPDX-License-Identifier: GPL-2.0-or-later
export const WORDBOOK_KEY='apollo-rope-lab.wordbook.v1';
const validWord=word=>Number.isInteger(word)&&word>=0&&word<=32767;
const title=name=>String(name||'Untitled word').trim().slice(0,40)||'Untitled word';
export class Wordbook {
 constructor(storage){this.storage=storage;this.words=[];this.draft=null;this.nextId=1;this.mode='notes';this.loop=false;this.saved=true;
  try{const data=JSON.parse(storage.getItem(WORDBOOK_KEY)||'{}');if(data.version!==1)return;const ids=new Set();for(const item of (Array.isArray(data.words)?data.words:[]).slice(0,128)){if(!item||!/^w\d+$/.test(item.id)||ids.has(item.id)||!validWord(item.word))continue;ids.add(item.id);this.words.push({id:item.id,name:title(item.name),word:item.word});this.nextId=Math.max(this.nextId,Number(item.id.slice(1))+1);}if(data.draft&&validWord(data.draft.word))this.draft={name:title(data.draft.name),word:data.draft.word,id:ids.has(data.draft.id)?data.draft.id:null};this.mode=data.mode==='bits'?'bits':'notes';this.loop=data.loop===true;}catch{}
 }
 persist(){try{this.storage.setItem(WORDBOOK_KEY,JSON.stringify({version:1,words:this.words,draft:this.draft,mode:this.mode,loop:this.loop}));this.saved=true;}catch{this.saved=false;}return this.saved;}
 keepDraft(){if(!this.draft)return;const saved=this.words.find(w=>w.id===this.draft.id);if(!saved||saved.word!==this.draft.word||saved.name!==this.draft.name)this.saveDraft();}
 newDraft(word=0,name='New word'){if(!validWord(word))throw new Error('Expected a 15-bit word.');this.keepDraft();this.draft={word,name:title(name),id:null};this.persist();return this.draft;}
 select(id){this.keepDraft();const word=this.words.find(w=>w.id===id);if(!word)return null;this.draft={...word};this.persist();return this.draft;}
 setDraft(word,name=this.draft?.name){if(!validWord(word))throw new Error('Expected a 15-bit word.');if(!this.draft)this.newDraft(word,name);else{this.draft.word=word;this.draft.name=title(name);this.persist();}return this.draft;}
 saveDraft(){if(!this.draft)throw new Error('Create or copy a word first.');const existing=this.words.find(w=>w.id===this.draft.id);if(existing)Object.assign(existing,{name:title(this.draft.name),word:this.draft.word});else{if(this.words.length>=128)throw new Error('The sketchbook holds up to 128 words.');const word={id:'w'+this.nextId++,name:title(this.draft.name),word:this.draft.word};this.words.push(word);this.draft.id=word.id;}this.persist();return this.draft.id;}
 move(id,direction){const i=this.words.findIndex(w=>w.id===id),j=i+direction;if(i<0||j<0||j>=this.words.length)return;[this.words[i],this.words[j]]=[this.words[j],this.words[i]];this.persist();}
 duplicate(id){this.keepDraft();const word=this.words.find(w=>w.id===id);if(!word)return;this.newDraft(word.word,word.name);this.saveDraft();}
 remove(id){this.words=this.words.filter(w=>w.id!==id);if(this.draft?.id===id)this.draft=null;this.persist();}
}
