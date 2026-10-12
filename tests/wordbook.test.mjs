// SPDX-License-Identifier: GPL-2.0-or-later
import assert from 'node:assert/strict';
import {Wordbook,WORDBOOK_KEY} from '../dist/agc/wordbook.mjs';
import {wordNote} from '../dist/agc/sonify.mjs';
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const book=new Wordbook(storage);book.newDraft();book.setDraft(1,'Quiet');let restored=new Wordbook(storage);assert.equal(restored.draft.word,1);assert.equal(restored.draft.name,'Quiet');
book.saveDraft();const first=book.draft.id;book.setDraft(2);book.newDraft(32767,'Bright');assert.equal(book.words[0].word,2,'New word retains previous edits');book.select(first);assert.equal(book.words.length,2,'Selecting a word retains the unsaved previous draft');assert.equal(book.words[1].word,32767);
book.setDraft(3);book.duplicate(first);assert.equal(book.words[0].word,3);assert.equal(book.words[2].word,3,'Copy uses the updated bits');const copy=book.draft.id;book.move(copy,-1);assert.equal(book.words[1].id,copy);book.remove(first);assert.equal(book.words.length,2);
book.mode='bits';book.loop=true;book.persist();restored=new Wordbook(storage);assert.equal(restored.mode,'bits');assert(restored.loop);assert.deepEqual(restored.words,book.words);assert.deepEqual(restored.draft,book.draft);restored.newDraft(0,'Bass');restored.saveDraft();assert.equal(new Set(restored.words.map(w=>w.id)).size,restored.words.length);
assert.equal(wordNote(0).name,'C3');assert.equal(wordNote(32767).name,'A5');assert.equal(wordNote(32767).frequency,880);assert(wordNote(16384).frequency>wordNote(0).frequency);assert.throws(()=>wordNote(32768));assert.throws(()=>book.setDraft(-1));
const blocked=new Wordbook({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});blocked.newDraft(5);assert(!blocked.saved);assert.equal(blocked.draft.word,5);
values.set(WORDBOOK_KEY,'{bad');assert.equal(new Wordbook(storage).words.length,0);
values.set(WORDBOOK_KEY,JSON.stringify({version:1,words:[{id:'w1',word:32768,name:'bad'},{id:'w2',word:4,name:'valid'}]}));assert.equal(new Wordbook(storage).words.length,1);
console.log('PASS: persistent drafts and words, automatic retention on navigation, updates/copies/order/removal, unique IDs, loop/mode restoration, note mapping, bounds and corrupt/blocked storage.');
