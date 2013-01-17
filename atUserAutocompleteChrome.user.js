// ==UserScript==
// @name           At User Autocomplete
// @namespace      Gon@cc98.org
// @description    at autocomplete
// @include        http://www.cc98.org/dispbbs.asp*
// @include        http://10.10.98.98/dispbbs.asp*
// @include        http://www.cc98.org/reannounce.asp*
// @include        http://10.10.98.98/reannounce.asp*
// @include        http://www.cc98.org/editannounce.asp*
// @include        http://10.10.98.98/editannounce.asp*
// @include        http://hz.cc98.lifetoy.org/dispbbs.asp*
// @include        http://hz.cc98.lifetoy.org/reannounce.asp*
// @include        http://hz.cc98.lifetoy.org/editannounce.asp*
// @include        http://us.cc98.lifetoy.org/dispbbs.asp*
// @include        http://us.cc98.lifetoy.org/reannounce.asp*
// @include        http://us.cc98.lifetoy.org/editannounce.asp*

// @exclude         
// @author         Gon
// @version        1.0  
// ==/UserScript==


// the following codes come from https://github.com/kir/js_cursor_position
// Copyright (c) 2010-2012 Kirill Maximov, released under the MIT license
// maxkir BEGIN

if (!window.maxkir) maxkir = {};
maxkir.FF = /Firefox/i.test(navigator.userAgent);

// Unify access to computed styles (for IE)
if (typeof document.defaultView == 'undefined') {
  document.defaultView = {};
  document.defaultView.getComputedStyle = function(element){
    return element.currentStyle;
  }
}

// This class allows to obtain position of cursor in the text area
// The position can be calculated as cursorX/cursorY or
// pointX/pointY
// See getCursorCoordinates and getPixelCoordinates
maxkir.CursorPosition = function(element, padding) {
  this.element = element;
  this.padding = padding;
  this.selection_range = new maxkir.SelectionRange(element);

  var that = this;

  this.get_string_metrics = function(s) {
    return maxkir.CursorPosition.getTextMetrics(element, s, padding);
  };

  var splitter = new maxkir.StringSplitter(function(s) {
    var metrics = that.get_string_metrics(s);
    //maxkir.info(s + " |||" + metrics)
    return metrics[0];
  });

  this.split_to_lines = function() {
    var innerAreaWidth = element.scrollWidth;
    if (maxkir.FF) {  // FF has some implicit additional padding
      innerAreaWidth -= 4;
    }

    var pos = that.selection_range.get_selection_range()[0];
    return splitter.splitString(element.value.substr(0, pos), innerAreaWidth);
  };

};

maxkir.CursorPosition.prototype.getCursorCoordinates = function() {
  var lines = this.split_to_lines();
  return [lines[lines.length - 1].length, lines.length];
};

maxkir.CursorPosition.prototype.getPixelCoordinates = function() {
  var lines = this.split_to_lines();
  var m = this.get_string_metrics(lines[lines.length - 1]);
  var w = m[0];
  var h = m[1] * lines.length - this.element.scrollTop + this.padding;
  return [w, h];
};

/** Return preferred [width, height] of the text as if it was written inside styledElement (textarea)
 * @param styledElement element to copy styles from
 * @s text for metrics calculation
 * @padding - explicit additional padding
 * */
maxkir.CursorPosition.getTextMetrics = function(styledElement, s, padding) {

  var element = styledElement;
  var clone_css_style = function(target, styleName) {
    var val = element.style[styleName];
    if (!val) {
      var css = document.defaultView.getComputedStyle(element, null);
      val = css ? css[styleName] : null;
    }
    if (val) {
      target.style[styleName] = val;
    }
  };

  var widthElementId = "__widther";
  var div = document.getElementById(widthElementId);
  if (!div) {
    div = document.createElement("div");
    document.body.appendChild(div)
    div.id = widthElementId;

    div.style.position = 'absolute';
    div.style.left = '-10000px';
  }

  clone_css_style(div, 'fontSize');
  clone_css_style(div, 'fontFamily');
  clone_css_style(div, 'fontWeight');
  clone_css_style(div, 'fontVariant');
  clone_css_style(div, 'fontStyle');
  clone_css_style(div, 'textTransform');
  clone_css_style(div, 'lineHeight');

  div.style.width = '0';
  div.style.paddingLeft = padding + "px";

  div.innerHTML = s.replace(' ', "&nbsp;");
  div.style.width = 'auto';
  return [div.offsetWidth, div.offsetHeight];

};

/**
 * Get current selection range for the TEXTAREA or INPUT[text] element.
 *
 * Usage:
 *
 *  var range = new maxkir.SelectionRange(textarea);
 *  var selection = range.get_selection_range()
 *  var selectionStart = selection[0]
 *  var selectionEnd   = selection[1]
 *  On a error, returns [0,0]
 *
 *  var selection_text = range.get_selection_text();
 *
 *
 * */
maxkir.SelectionRange = function(element) {
  this.element = element;
};


maxkir.SelectionRange.prototype.get_selection_range = function() {

  var get_sel_range = function(element) {
    // thanks to http://the-stickman.com/web-development/javascript/finding-selection-cursor-position-in-a-textarea-in-internet-explorer/
    if( (typeof element.selectionStart == 'undefined') && document.selection ){
      // The current selection
      var range = document.selection.createRange();
      // We'll use this as a 'dummy'
      var stored_range = range.duplicate();
      // Select all text
      if (element.type == 'text') {
        stored_range.moveStart('character', -element.value.length);
        stored_range.moveEnd('character', element.value.length);
      } else { // textarea
        stored_range.moveToElementText( element );
      }
      // Now move 'dummy' end point to end point of original range
      stored_range.setEndPoint( 'EndToEnd', range );
      // Now we can calculate start and end points
      var selectionStart = stored_range.text.length - range.text.length;
      var selectionEnd = selectionStart + range.text.length;
      return [selectionStart, selectionEnd];
    }
    return [element.selectionStart, element.selectionEnd];
  };

  try {
    return get_sel_range(this.element);
  }
  catch(e) {
    return [0,0]
  }
};

maxkir.SelectionRange.prototype.get_selection_text = function() {
  var r = this.get_selection_range();
  return this.element.value.substring(r[0], r[1]);
};

// width_provider_function is a function which takes one argument - a string
// and returns width of the string
maxkir.StringSplitter = function(width_provider_function) {
  this.get_width = width_provider_function;
};

// returns array of strings, as if they are splitted in textarea
maxkir.StringSplitter.prototype.splitString = function(s, max_width) {

  if (s.length == 0) return [""];
  
  var prev_space_pos = -1;
  var width_exceeded = false;

  var that = this;
  var cut_off = function(idx) {
    var remaining = s.substr(idx + 1);
    if (remaining.length > 0) {
      return [s.substr(0, idx + 1)].concat(that.splitString(remaining, max_width));
    }
    return [s.substr(0, idx + 1)]; 
  };

  for(var i = 0; i < s.length; i ++) {
    if (s.charAt(i) == ' ') {

      width_exceeded = this.get_width(s.substr(0, i)) > max_width;
      if (width_exceeded && prev_space_pos > 0) {
        return cut_off(prev_space_pos);
      }
      if (width_exceeded) {
        return cut_off(i);
      }
      prev_space_pos = i;
    }
    if (s.charAt(i) == '\n') {
      return cut_off(i);
    }
  }

  if (prev_space_pos > 0 && this.get_width(s) > max_width) {
    return cut_off(prev_space_pos);
  }
  return [s];
};

// maxkir END


// the following codes come from MDN
// MDN BEGIN

(function(DOMParser) {  
    "use strict";  
    var DOMParser_proto = DOMParser.prototype  
      , real_parseFromString = DOMParser_proto.parseFromString;

    // Firefox/Opera/IE throw errors on unsupported types  
    try {  
        // WebKit returns null on unsupported types  
        if ((new DOMParser).parseFromString("", "text/html")) {  
            // text/html parsing is natively supported  
            return;  
        }  
    } catch (ex) {}  

    DOMParser_proto.parseFromString = function(markup, type) {  
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {  
            var doc = document.implementation.createHTMLDocument("")
              , doc_elt = doc.documentElement
              , first_elt;

            doc_elt.innerHTML = markup;
            first_elt = doc_elt.firstElementChild;

            if (doc_elt.childElementCount === 1
                && first_elt.localName.toLowerCase() === "html") {  
                doc.replaceChild(first_elt, doc_elt);  
            }  

            return doc;  
        } else {  
            return real_parseFromString.apply(this, arguments);  
        }  
    };  
}(DOMParser));

// MDN END

var edit_area = document.getElementById("content");
var btns = document.getElementsByName("Submit");
var submitBtn, form_id = 0;

if (document.body.innerText.match(/\* 帖子主题： .*/) != null) {
  form_id = 0;
}else {
  if (document.body.innerText.match(/回复帖子.*/) != null)  {
      form_id = 1;
    }else {
    
    if (document.body.innerText.match(/编辑帖子.*/) != null)
      form_id = 2;
  }
} 

for (i=0;i<btns.length;i++)
{
  if (form_id == 0) {
    if (btns[i].value == "OK!发表我的回应帖子") {
      submitBtn = btns[i];
    }
  }else {
    if (btns[i].value == "发 表") {
      submitBtn = btns[i];
    }
  }
    
}

var on_ac = false;
var list_pos = 0;
var exists = false;
var positioner = new maxkir.CursorPosition(edit_area, 7);
var ac_list = getAutoCompleteList();

var autocompleteList = document.createElement('div');

autocompleteList.id = 'acdiv';
autocompleteList.style.width = '150px';
autocompleteList.style.visibility = 'hidden';
autocompleteList.style.background = '#CCCCCC';
autocompleteList.style.borderStyle = 'solid';
autocompleteList.style.borderWidth = '2px';
autocompleteList.style.borderColor = '#000000';
autocompleteList.style.zIndex = 100001;
autocompleteList.style.position = 'absolute';

document.body.appendChild(autocompleteList);

edit_area.onkeyup = function (evt) {
  e = evt;
  evt=evt?evt:window.event;
  if (evt.keyCode == 40 && on_ac) { // arrow down
    moveNext();
  } else if (evt.keyCode == 38 && on_ac) { // arrow up
    movePrev();
  } else if (evt.keyCode == 13 && on_ac && list_pos != 0) {
    setAutoCompleteValue(edit_area, autocompleteList.childNodes[list_pos - 1].innerHTML)
    closeAutoComplete();   
  } else {
    var r = searchAtText(edit_area);
    if (r != undefined) {
      showAutoComplete(r, ac_list);
    } else {
      closeAutoComplete();
    }      
  }
}

edit_area.onclick = function(evt) {
  var r = searchAtText(edit_area);
  if (r != undefined) {
    showAutoComplete(r, ac_list);
  } else {
    closeAutoComplete();
  }
}

edit_area.onblur = function(evt) {
  closeAutoComplete();
}

edit_area.onkeydown = function (evt) {
  evt=evt?evt:window.event;
  if (evt.keyCode == 13 && evt.ctrlKey) {
    submitBtn.click();
  } else if ((evt.keyCode == 38 || evt.keyCode == 40 || evt.keyCode == 13) && on_ac) {
    evt.preventDefault();
    evt.stopPropagation();
  }
}

function moveNext() {
  if (exists) {
  if (list_pos != 0)
    autocompleteList.childNodes[list_pos - 1].style.background = '#CCCCCC'
  list_pos++;
  if (list_pos > autocompleteList.childNodes.length)
    list_pos = 1;
  autocompleteList.childNodes[list_pos - 1].style.background = '#FFBF00'
  }
}

function movePrev() {
  if (exists) {
  if (list_pos != 0)
    autocompleteList.childNodes[list_pos - 1].style.background = '#CCCCCC'
  list_pos--;
  if (list_pos <= 0)
    list_pos = autocompleteList.childNodes.length;
  autocompleteList.childNodes[list_pos - 1].style.background = '#FFBF00'
  }
}

function getAutoCompleteList() {
  var ac_list = new Array();
  var xmlhttp = new XMLHttpRequest();
  if (xmlhttp == null) return;

  xmlhttp.open("get",'http://' + window.location.host + '/usersms.asp?action=friend', false);
  xmlhttp.send();

  var doc = new DOMParser().parseFromString(xmlhttp.responseText, 'text/html');
  var us = doc.querySelectorAll('tbody')[8].querySelectorAll('tr');
  if (us[2].querySelectorAll('td').length != 1) { // if friends exist
    for (var i = 2; i < us.length - 1; i++) {
      ac_list.push(us[i].querySelectorAll('td')[0].querySelector('a').innerHTML);
    }
  }

  var n_p = null;
  if (window.location.href.indexOf('reannounce.asp?') != -1)
    n_p = window.location.href.replace('reannounce.asp?', 'dispbbs.asp?');
  else if (window.location.href.indexOf('editannounce.asp?') != -1)
    n_p = window.location.href.replace('editannounce.asp?', 'dispbbs.asp?');

  var doc1 = null;
  if (n_p != null) {
    var xmlhttp1 = new XMLHttpRequest();
    if (xmlhttp1 == null) return;

    xmlhttp1.open("get", n_p, false);
    xmlhttp1.send();

    doc1 = new DOMParser().parseFromString(xmlhttp1.responseText, 'text/html');    
  }

  if (doc1 == null)
    var ps = document.querySelectorAll('table[cellpadding="5"]');
  else
    var ps = doc1.querySelectorAll('table[cellpadding="5"]');

  if (ps != null) {
    for (var i = 0; i < ps.length; i++) {
      var new_f = ps[i].querySelector('tr').querySelector('tr').querySelector('b').innerHTML;
      if (ac_list.indexOf(new_f) == -1)
        ac_list.push(new_f);
    }
  }

  return ac_list;
}

function showAutoComplete(text, wordlist) {
  var c_pos = getCumulativeOffset(edit_area);
  var child_pos = positioner.getPixelCoordinates();
  
  autocompleteList.style.left = (c_pos[0] + child_pos[0]) + 'px';
  autocompleteList.style.top = (c_pos[1] + child_pos[1]) + 'px';
  autocompleteList.style.visibility = 'visible';
  autocompleteList.innerHTML = '';

  exists = false;
  for (var i = 0; i < wordlist.length; i++) {
    if (wordlist[i].indexOf(text.toLowerCase()) !== -1 
      || wordlist[i].indexOf(text.toUpperCase()) !== -1) {
      autocompleteList.appendChild(createAutoCompleteItem(wordlist[i]));
      exists = true;
    }
  }

  if (!exists) {
    autocompleteList.innerHTML = 'Not found';
  }
  on_ac = true;
  list_pos = 0;
}

function closeAutoComplete() {
  autocompleteList.style.visibility = 'hidden';
  on_ac = false;
}

function setAutoCompleteValue(element, value) {
  var content = element.value;

  for (var i = content.length; i >= 0; i--) {
    if (content[i] == '@') {
      element.value = content.substring(0, i + 1) + value + ' ';
      element.focus();
      return ;
    }
  }
}

function searchAtText(element) {
  var content = element.value;
  var cur_pos = getCaretPosition(edit_area);

  for (var i = cur_pos; i >= 0; i--) {
    if (content[i] == '@') {
      return content.substring(i + 1, cur_pos + 1);
    } else if (content[i] == ' ' || content[i] == '\n') {
      return;
    }
  }
  return;
}

function createAutoCompleteItem(value) {
  var item = document.createElement('div');

  item.style.padding = '4px';
  item.style.height = '15px';
  item.innerHTML = value;
  
  item.onmouseover = function() {
    this.style.background = '#FFBF00';
  }

  item.onmouseout = function() {
    this.style.background = '#CCCCCC';
  }

  item.onmousedown = function(evt) {
    setAutoCompleteValue(edit_area, this.innerHTML);
    closeAutoComplete();
  }

  item.onkeypress = function(evt) {
    evt = evt ? evt:window.event;
      if (evt.keyCode == 13){
        setAutoCompleteValue(edit_area, this.innerHTML);
        closeAutoComplete();
    }
  }  

  return item
}

// the following codes come from blog.vishalon.net/
// vishalon BEGIN

function getCaretPosition (ctrl) {

  var CaretPos = 0;
  // IE Support
  if (document.selection) {

    ctrl.focus ();
    var Sel = document.selection.createRange ();

    Sel.moveStart ('character', -ctrl.value.length);

    CaretPos = Sel.text.length;
  }
  // Firefox support
  else if (ctrl.selectionStart || ctrl.selectionStart == '0')
    CaretPos = ctrl.selectionStart;

  return (CaretPos);

}

// vishalon END

// the following codes come from prototype.js (modified)
// prototype BEGIN

function getCumulativeOffset(element) {
  var valueT = 0, valueL = 0;
  if (element.parentNode) {
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
  }
  return [valueL, valueT];
}

// prototype END
