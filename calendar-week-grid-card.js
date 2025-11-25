function t(t,e,s,i){var r,n=arguments.length,o=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(o=(n<3?r(o):n>3?r(e,s,o):r(e,s))||o);return n>3&&o&&Object.defineProperty(e,s,o),o}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),r=new WeakMap;let n=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&r.set(e,t))}return t}toString(){return this.cssText}};const o=t=>new n("string"==typeof t?t:t+"",void 0,i),a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return o(e)})(t):t,{is:h,defineProperty:c,getOwnPropertyDescriptor:l,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,f=globalThis,$=f.trustedTypes,g=$?$.emptyScript:"",m=f.reactiveElementPolyfillSupport,_=(t,e)=>t,v={toAttribute(t,e){switch(e){case Boolean:t=t?g:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},y=(t,e)=>!h(t,e),A={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),f.litPropertyMetadata??=new WeakMap;let E=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=A){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&c(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:r}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const n=i?.call(this);r?.call(this,e),this.requestUpdate(t,n,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??A}static _$Ei(){if(this.hasOwnProperty(_("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(_("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(_("properties"))){const t=this.properties,e=[...d(t),...p(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),r=e.litNonce;void 0!==r&&i.setAttribute("nonce",r),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const r=(void 0!==s.converter?.toAttribute?s.converter:v).toAttribute(e,s.type);this._$Em=t,null==r?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:v;this._$Em=i;const n=r.fromAttribute(e,t.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(t,e,s){if(void 0!==t){const i=this.constructor,r=this[t];if(s??=i.getPropertyOptions(t),!((s.hasChanged??y)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:r},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==r||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};E.elementStyles=[],E.shadowRootOptions={mode:"open"},E[_("elementProperties")]=new Map,E[_("finalized")]=new Map,m?.({ReactiveElement:E}),(f.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const b=globalThis,w=b.trustedTypes,S=w?w.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",x=`lit$${Math.random().toFixed(9).slice(2)}$`,P="?"+x,T=`<${P}>`,U=document,O=()=>U.createComment(""),H=t=>null===t||"object"!=typeof t&&"function"!=typeof t,D=Array.isArray,k="[ \t\n\f\r]",M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,N=/>/g,z=RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),j=/'/g,I=/"/g,L=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),W=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),F=new WeakMap,V=U.createTreeWalker(U,129);function G(t,e){if(!D(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}const Z=(t,e)=>{const s=t.length-1,i=[];let r,n=2===e?"<svg>":3===e?"<math>":"",o=M;for(let e=0;e<s;e++){const s=t[e];let a,h,c=-1,l=0;for(;l<s.length&&(o.lastIndex=l,h=o.exec(s),null!==h);)l=o.lastIndex,o===M?"!--"===h[1]?o=R:void 0!==h[1]?o=N:void 0!==h[2]?(L.test(h[2])&&(r=RegExp("</"+h[2],"g")),o=z):void 0!==h[3]&&(o=z):o===z?">"===h[0]?(o=r??M,c=-1):void 0===h[1]?c=-2:(c=o.lastIndex-h[2].length,a=h[1],o=void 0===h[3]?z:'"'===h[3]?I:j):o===I||o===j?o=z:o===R||o===N?o=M:(o=z,r=void 0);const d=o===z&&t[e+1].startsWith("/>")?" ":"";n+=o===M?s+T:c>=0?(i.push(a),s.slice(0,c)+C+s.slice(c)+x+d):s+x+(-2===c?e:d)}return[G(t,n+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class J{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let r=0,n=0;const o=t.length-1,a=this.parts,[h,c]=Z(t,e);if(this.el=J.createElement(h,s),V.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=V.nextNode())&&a.length<o;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(C)){const e=c[n++],s=i.getAttribute(t).split(x),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:o[2],strings:s,ctor:"."===o[1]?tt:"?"===o[1]?et:"@"===o[1]?st:Y}),i.removeAttribute(t)}else t.startsWith(x)&&(a.push({type:6,index:r}),i.removeAttribute(t));if(L.test(i.tagName)){const t=i.textContent.split(x),e=t.length-1;if(e>0){i.textContent=w?w.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],O()),V.nextNode(),a.push({type:2,index:++r});i.append(t[e],O())}}}else if(8===i.nodeType)if(i.data===P)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=i.data.indexOf(x,t+1));)a.push({type:7,index:r}),t+=x.length-1}r++}}static createElement(t,e){const s=U.createElement("template");return s.innerHTML=t,s}}function K(t,e,s=t,i){if(e===W)return e;let r=void 0!==i?s._$Co?.[i]:s._$Cl;const n=H(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),void 0===n?r=void 0:(r=new n(t),r._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=r:s._$Cl=r),void 0!==r&&(e=K(t,r._$AS(t,e.values),r,i)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??U).importNode(e,!0);V.currentNode=i;let r=V.nextNode(),n=0,o=0,a=s[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new X(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new it(r,this,t)),this._$AV.push(e),a=s[++o]}n!==a?.index&&(r=V.nextNode(),n++)}return V.currentNode=U,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=K(this,t,e),H(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>D(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&H(this._$AH)?this._$AA.nextSibling.data=t:this.T(U.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=J.createElement(G(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new Q(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=F.get(t.strings);return void 0===e&&F.set(t.strings,e=new J(t)),e}k(t){D(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const r of t)i===e.length?e.push(s=new X(this.O(O()),this.O(O()),this,this.options)):s=e[i],s._$AI(r),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Y{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,r){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const r=this.strings;let n=!1;if(void 0===r)t=K(this,t,e,0),n=!H(t)||t!==this._$AH&&t!==W,n&&(this._$AH=t);else{const i=t;let o,a;for(t=r[0],o=0;o<r.length-1;o++)a=K(this,i[s+o],e,o),a===W&&(a=this._$AH[o]),n||=!H(a)||a!==this._$AH[o],a===q?t=q:t!==q&&(t+=(a??"")+r[o+1]),this._$AH[o]=a}n&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tt extends Y{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class et extends Y{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class st extends Y{constructor(t,e,s,i,r){super(t,e,s,i,r),this.type=5}_$AI(t,e=this){if((t=K(this,t,e,0)??q)===W)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class it{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){K(this,t)}}const rt=b.litHtmlPolyfillSupport;rt?.(J,X),(b.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends E{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let r=i._$litPart$;if(void 0===r){const t=s?.renderBefore??null;i._$litPart$=r=new X(e.insertBefore(O(),t),t,void 0,s??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const at=nt.litElementPolyfillSupport;at?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ht={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:y},ct=(t=ht,e,s)=>{const{kind:i,metadata:r}=s;let n=globalThis.litPropertyMetadata.get(r);if(void 0===n&&globalThis.litPropertyMetadata.set(r,n=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),n.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const r=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,r,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const r=this[i];e.call(this,s),this.requestUpdate(i,r,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function lt(t){return(e,s)=>"object"==typeof s?ct(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function dt(t){return lt({...t,state:!0,attribute:!1})}var pt=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new n(s,t,i)})`:host {
  display: block;
  --event-color: var(--primary-text-color, #ffffff);
  --event-bg: transparent;
  --normal-color: var(--primary-text-color, #555);
  --normal-bg: transparent;
  --grid-bg: var(--card-background-color, #1c1c1e);
  --text-primary: var(--primary-text-color, #ffffff);
  --text-secondary: var(--secondary-text-color, #999999);
  --current-time-color: var(--primary-color, #ea4335);
}

ha-card {
  color: var(--text-primary);
  padding: 8px 16px 16px 8px;
}

.grid-container {
  display: grid;
  grid-template-columns: 50px repeat(7, 1fr);
  gap: 4px;
  overflow-x: auto;
}

.time-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
  padding-right: 8px;
  align-self: center;
}

.day-header {
  text-align: center;
  font-weight: bold;
  padding: 8px 4px;
  border-radius: 4px;
  font-size: 14px;
}

.cell {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--normal-bg);
  color: var(--normal-color);
  position: relative;
}

.cell.has-event {
  color: var(--event-color);
}

.event-block {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  border-radius: 4px;
}

ha-icon {
  --mdc-icon-size: var(--icon-size, 18px);
  position: relative;
  z-index: 1;
}

.current-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--current-time-color);
  z-index: 5;
  pointer-events: none;
  margin-top: -1px;
}

.current-time-circle {
  width: 6px;
  height: 6px;
  background-color: var(--current-time-color);
  border-radius: 50%;
  position: absolute;
  left: -3px;
  top: -2px;
}
`;const ut=Array.from({length:24},(t,e)=>e);let ft=class extends ot{constructor(){super(...arguments),this.events=[],this.lastFetched=0}static get styles(){return o(pt)}setConfig(t){if(!t.entities)throw new Error("Please define entities");this.config=t}updated(t){t.has("hass")&&this.fetchEventsIfNeeded()}render(){if(!this.hass||!this.config)return B``;if(!this.lastFetched)return this.fetchEvents(),B`<ha-card>Loading...</ha-card>`;const t=this.getDays();return B`
      <ha-card>
        <div class="grid-container">
          <!-- Header Row -->
          <div></div>
          ${t.map(t=>B`
              <div class="day-header ${t.isToday?"today":""}">
                ${t.label}
              </div>
            `)}

          <!-- Grid Rows -->
          ${ut.map(e=>this.renderRow(e,t))}
        </div>
      </ha-card>
    `}renderRow(t,e){const s=`${t.toString().padStart(2,"0")}:00`;return B`
      <div class="time-label">${s}</div>
      ${e.map(e=>this.renderCell(e,t))}
    `}renderCell(t,e){const s=new Date(t.date),i=s.setHours(e),r=s.setHours(e+1),n=this.events.filter(t=>i<t.end.getTime()&&r>t.start.getTime()),o=n[0],a=this.getCellConfig("height",o),h=this.getCellConfig("icon_size",o);return B`
      <div class="cell ${o?"has-event":""}" style="${`\n      ${void 0!==a?`height: ${a};`:""}\n      ${void 0!==h?`--icon-size: ${h};`:""}\n    `}">
        ${this.renderCurrentTimeLine(t,e)}
        ${this.renderEventBlocks(n,i,r)}
        ${this.renderEventIcon(o)}
      </div>
    `}renderEventIcon(t){const e=this.getCellConfig("icon",t,"mdi:check-circle"),s=this.getCellConfig("opacity",t,1,1),i=this.getCellConfig("color",t);return B`<ha-icon icon="${e}" style="${`\n      ${void 0!==i?`color: ${i};`:""}\n      ${void 0!==s?`opacity: ${s};`:""}\n    `}"></ha-icon>`}renderCurrentTimeLine(t,e){if(!t.isToday)return"";const s=new Date;if(s.getHours()!==e)return"";const i=s.getMinutes();return B`
      <div class="current-time-line" style="${`top: ${i/60*100}%;`}">
        <div class="current-time-circle"></div>
      </div>
    `}renderEventBlocks(t,e,s){return t.map(t=>this.renderEventBlock(t,e,s))}renderEventBlock(t,e,s){const i=t.start.getTime(),r=t.end.getTime(),n=Math.max(e,i),o=s-e,a=(n-e)/o*100,h=(Math.min(s,r)-n)/o*100,c="transparent",l=this.getCellConfig("background_color",t,c,c),d=this.getCellConfig("background_opacity",t,.2,.2);return B`<div class="event-block" style="${`\n      top: ${a}%;\n      height: ${h}%;\n      background-color: ${l};\n      ${void 0!==d?`opacity: ${d};`:""}\n    `}"></div>`}getDays(){const t=[],e=this.toHaTime(new Date);e.setHours(0,0,0,0);const s=this.config?.language||this.hass?.language||"en",i=new Intl.DateTimeFormat(s,{weekday:"short"});for(let s=0;s<7;s++){const r=new Date(e);r.setDate(e.getDate()+s);const n=i.format(r),o=n.charAt(0).toUpperCase()+n.slice(1);t.push({date:r,label:o,isToday:0===s})}return t}fetchEventsIfNeeded(){const t=Date.now();this.lastFetched&&t-this.lastFetched<6e4||this.fetchEvents()}async fetchEvents(){if(!this.hass)return;const t=this.getNormalizedEntities();if(!t.length)return void(this.events=[]);this.lastFetched=Date.now();const e=new Date;e.setHours(0,0,0,0),e.setDate(e.getDate()-1);const s=new Date(e);s.setDate(s.getDate()+10);const i=e.toISOString(),r=s.toISOString();try{const e=t.map(t=>this.fetchEntityEvents(t,i,r)),s=(await Promise.all(e)).flat();this.events=s.map(t=>({...t,start:this.normalizeDate(t.start),end:this.normalizeDate(t.end)}))}catch(t){console.error("CalendarWeekGridCard: Error fetching events:",t),this.events=[]}}async fetchEntityEvents(t,e,s){if(!this.hass)return[];try{const i=await this.hass.callApi("GET",`calendars/${t.entity}?start=${e}&end=${s}`),r=t.filter||this.config?.filter;return i.filter(t=>!r||t.summary&&t.summary.includes(r)).map(e=>({...e,...t}))}catch(e){return console.error(`CalendarWeekGridCard: Failed to fetch ${t.entity}`,e),[]}}normalizeDate(t){return t instanceof Date?t:t.dateTime?this.toHaTime(new Date(t.dateTime)):t.date?new Date(t.date+"T00:00:00"):new Date}getNormalizedEntities(){return(this.config?.entities||[]).map(t=>"string"==typeof t?{entity:t}:t).filter(t=>!(!t||!t.entity))}getCellConfig(t,e,s,i){const r=this.config?.cell?.[t];if(e){const i=e.cell?.[t],n=this.config?.cell_filled?.[t];return i||n||r||s}{const e=this.config?.cell_blank?.[t];return e||r||i}}toHaTime(t){try{const e=this.hass?.config?.time_zone;if(!e)return t;const s=t.toLocaleString("en-US",{timeZone:e});return new Date(s)}catch(e){return console.error("Timezone conversion error",e),t}}};t([lt({attribute:!1})],ft.prototype,"hass",void 0),t([dt()],ft.prototype,"config",void 0),t([dt()],ft.prototype,"events",void 0),ft=t([(t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("calendar-week-grid-card")],ft);export{ft as CalendarWeekGridCard};
