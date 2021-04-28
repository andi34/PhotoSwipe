/**
 *
 * UI on top of main sliding area (caption, arrows, close button, etc.).
 * Built just using public methods/properties of PhotoSwipe.
 *
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.PhotoSwipeUI_Default = factory();
	}
})(this, function () {
	'use strict';

	var PhotoSwipeUI_Default = function (pswp, framework) {
		var ui = this;
		var _overlayUIUpdated = false,
			_controlsVisible = true,
			_fullscrenAPI,
			_stopAllAnimations,
			_controls,
			_captionContainer,
			_fakeCaptionContainer,
			_indexIndicator,
			_prevButton,
			_nextButton,
			_shareButton,
			_shareModal,
			_shareModalHidden = true,
			_downloadButton,
			_initalCloseOnScrollValue,
			_isIdle,
			_listen,
			_loadingIndicator,
			_loadingIndicatorHidden,
			_loadingIndicatorTimeout,
			_galleryHasOneSlide,
			_stylesheet,
			_ruleExpanded,
			_ruleCollapsed,
			_options,
			_defaultUIOptions = {
				barsSize: {top: 44, bottom: 'auto'},
				closeElClasses: ['item', 'caption', 'zoom-wrap', 'ui', 'top-bar'],
				timeToIdle: 4000,
				timeToIdleOutside: 1000,
				loadingIndicatorDelay: 1000, // 2s

				addCaptionHTMLFn: function (item, captionElement /*, isFake */) {
					var captionCtrl = pswp.scrollWrap.querySelector('.pswp__button--caption--ctrl');
					var captionElement = captionCtrl.parentNode;
					var innerCaptionElement = captionElement.querySelector('.pswp__caption__center');
					var imagePositionTop;
					if (item.initialPosition) {
						imagePositionTop = item.initialPosition.y;
					} else {
						imagePositionTop = 0;
					}
					var apparentImageHeight = Math.round(item.h * item.initialZoomLevel);
					var gapTop = item.vGap;
					var naturalCaptionHeight = innerCaptionElement.clientHeight;
					var layoutData = _getLayoutData(captionElement);

					if (!item.title) {
						innerCaptionElement.innerHTML = '';
						return false;
					}
					innerCaptionElement.innerHTML = item.title;

					// If allowLongCaptions is true, position caption just under picture and show "Expand" button if necessary
					if (_options.allowLongCaptions) {
						ui.resetCaption();
						_setLayoutData(captionElement, imagePositionTop, apparentImageHeight, gapTop, naturalCaptionHeight);

						// Show the 'expand' control only if caption extends out of view. Reset height first.
						if (naturalCaptionHeight - 10 > layoutData.maxCollapsedCaptionHeight) {
							captionCtrl.classList.add('pswp__button--caption--ctrl--expand');
							captionCtrl.setAttribute('aria-controls', 'pswp__caption__center');

							innerCaptionElement.setAttribute('aria-expanded', 'false');
						} else {
							_resetCaption(captionCtrl);
						}

						_ruleCollapsed.style.height = layoutData.maxCollapsedCaptionHeight + 'px';
						innerCaptionElement.classList.add('collapsed');
					}

					return true;
				},

				closeEl: true,
				captionEl: true,
				allowLongCaptions: false,
				fullscreenEl: true,
				zoomEl: true,
				shareEl: true,
				downloadEl: true,
				counterEl: true,
				arrowEl: true,
				preloaderEl: true,
				closeOnOutsideClick: true,

				tapToClose: false,
				tapToToggleControls: true,

				clickToCloseNonZoomable: true,
				clickToShowNextNonZoomable: false,

				shareButtons: [
					{id: 'facebook', label: 'Share on Facebook', url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}'},
					{id: 'twitter', label: 'Tweet', url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'},
					{
						id: 'pinterest',
						label: 'Pin it',
						url: 'http://www.pinterest.com/pin/create/button/' + '?url={{url}}&media={{image_url}}&description={{text}}'
					},
					{id: 'download', label: 'Download image', url: '{{raw_image_url}}', download: true}
				],
				getImageURLForShare: function (/* shareButtonData */) {
					return pswp.currItem.src || '';
				},
				getPageURLForShare: function (/* shareButtonData */) {
					return window.location.href;
				},
				getTextForShare: function (/* shareButtonData */) {
					return pswp.currItem.title || '';
				},

				indexIndicatorSep: ' / ',
				fitControlsWidth: 1200
			},
			_blockControlsTap,
			_blockControlsTapTimeout;

		// Write key layout dimensions as data attributes on the caption element
		var _setLayoutData = function (captionElement, imagePositionTop, apparentImageHeight, gapTop, naturalCaptionHeight) {
			captionElement.dataset.imagePositionTop = imagePositionTop;
			captionElement.dataset.apparentImageHeight = apparentImageHeight;
			captionElement.dataset.gapTop = gapTop;
			captionElement.dataset.naturalCaptionHeight = naturalCaptionHeight;
		};

		var _getLayoutData = function (captionElement) {
			var layoutData = {};

			// Read data attributes on the caption element
			layoutData.gapTop = parseInt(captionElement.dataset.gapTop, 10);
			layoutData.imagePositionTop = parseInt(captionElement.dataset.imagePositionTop, 10);
			layoutData.apparentImageHeight = parseInt(captionElement.dataset.apparentImageHeight, 10);
			layoutData.naturalCaptionHeight = parseInt(captionElement.dataset.naturalCaptionHeight, 10);

			var imageBottomEdgeFromTop = layoutData.imagePositionTop + layoutData.apparentImageHeight;
			layoutData.maxCollapsedCaptionHeight = window.innerHeight - imageBottomEdgeFromTop;
			layoutData.maxExpandedCaptionHeight = window.innerHeight - layoutData.gapTop;

			return layoutData;
		};

		var _resetCaption = function (captionCtrl) {
			if (!captionCtrl) {
				captionCtrl = pswp.scrollWrap.querySelector('.pswp__button--caption--ctrl');
			}

			captionCtrl.classList.remove('pswp__button--caption--ctrl--expand');
			captionCtrl.classList.remove('pswp__button--caption--ctrl--collapse');
			captionCtrl.removeAttribute('aria-controls');

			var innerCaptionElement = captionCtrl.parentNode.querySelector('.pswp__caption__center');
			innerCaptionElement.removeAttribute('aria-expanded');
			innerCaptionElement.classList.remove('expanded');
			innerCaptionElement.classList.remove('collapsed');

			_ruleExpanded.style.height = 'auto';
			_ruleCollapsed.style.height = 'auto';
		};

		var _toggleCaption = function (captionCtrl) {
			if (!captionCtrl) {
				captionCtrl = pswp.scrollWrap.querySelector('.pswp__button--caption--ctrl');
			}

			var captionElement = captionCtrl.parentNode;
			var innerCaptionElement = captionElement.querySelector('.pswp__caption__center');
			var layoutData = _getLayoutData(captionElement);

			if (captionCtrl.classList.contains('pswp__button--caption--ctrl--expand')) {
				// Expand caption
				if (layoutData.naturalCaptionHeight < layoutData.maxExpandedCaptionHeight) {
					// It fits in space below top bar
					_ruleExpanded.style.height = layoutData.naturalCaptionHeight + 'px';
				} else {
					// Caption is taller than the space available
					_ruleExpanded.style.height = layoutData.maxExpandedCaptionHeight + 'px';
					innerCaptionElement.style.overflowY = 'auto';
				}

				captionCtrl.classList.remove('pswp__button--caption--ctrl--expand');
				captionCtrl.classList.add('pswp__button--caption--ctrl--collapse');
				captionCtrl.setAttribute('title', 'Collapse caption');

				innerCaptionElement.classList.remove('collapsed');
				innerCaptionElement.classList.add('expanded');
				innerCaptionElement.setAttribute('aria-expanded', 'true');
			} else {
				// Collapse caption
				_ruleCollapsed.style.height = layoutData.maxCollapsedCaptionHeight + 'px';

				captionCtrl.classList.add('pswp__button--caption--ctrl--expand');
				captionCtrl.classList.remove('pswp__button--caption--ctrl--collapse');
				captionCtrl.setAttribute('title', 'Expand caption');

				innerCaptionElement.style.overflowY = 'hidden';
				innerCaptionElement.classList.remove('expanded');
				innerCaptionElement.classList.add('collapsed');
				innerCaptionElement.setAttribute('aria-expanded', 'false');
			}
		};

		var _onControlsTap = function (e) {
				if (_blockControlsTap) {
					return true;
				}

				e = e || window.event;

				if (_options.timeToIdle && _options.mouseUsed && !_isIdle) {
					// reset idle timer
					_onIdleMouseMove();
				}

				var target = e.target || e.srcElement,
					uiElement,
					clickedClass = target.getAttribute('class') || '',
					found;

				for (var i = 0; i < _uiElements.length; i++) {
					uiElement = _uiElements[i];
					if (uiElement.onTap && clickedClass.indexOf('pswp__' + uiElement.name) > -1) {
						uiElement.onTap(target);
						found = true;
					}
				}

				// Long captions will contain HTML so caption element will be an ancestor of target
				if (target.closest('.pswp__caption__center')) {
					found = true;
				}

				if (found) {
					if (e.stopPropagation) {
						e.stopPropagation();
					}
					_blockControlsTap = true;

					// Some versions of Android don't prevent ghost click event
					// when preventDefault() was called on touchstart and/or touchend.
					//
					// This happens on v4.3, 4.2, 4.1,
					// older versions strangely work correctly,
					// but just in case we add delay on all of them)
					var tapDelay = framework.features.isOldAndroid ? 600 : 30;
					_blockControlsTapTimeout = setTimeout(function () {
						_blockControlsTap = false;
					}, tapDelay);
				}
			},
			_fitControlsInViewport = function () {
				return (
					!pswp.likelyTouchDevice || _options.mouseUsed || screen.width > _options.fitControlsWidth || _options.allowLongCaptions
				);
			},
			_togglePswpClass = function (el, cName, add) {
				framework[(add ? 'add' : 'remove') + 'Class'](el, 'pswp__' + cName);
			},
			// add class when there is just one item in the gallery
			// (by default it hides left/right arrows and 1ofX counter)
			_countNumItems = function () {
				var hasOneSlide = _options.getNumItemsFn() === 1;

				if (hasOneSlide !== _galleryHasOneSlide) {
					_togglePswpClass(_controls, 'ui--one-slide', hasOneSlide);
					_galleryHasOneSlide = hasOneSlide;
				}
			},
			_downloadFile = function () {
				var link = document.createElement('A');
				link.setAttribute('href', pswp.currItem.downloadURL || pswp.currItem.src || '');
				link.setAttribute('target', '_blank');
				link.setAttribute('download', '');

				_downloadButton.appendChild(link);
				link.click();
				_downloadButton.removeChild(link);
			},
			_toggleShareModalClass = function () {
				_togglePswpClass(_shareModal, 'share-modal--hidden', _shareModalHidden);
			},
			_toggleShareModal = function () {
				_shareModalHidden = !_shareModalHidden;

				if (!_shareModalHidden) {
					_toggleShareModalClass();
					setTimeout(function () {
						if (!_shareModalHidden) {
							framework.addClass(_shareModal, 'pswp__share-modal--fade-in');
						}
					}, 30);
				} else {
					framework.removeClass(_shareModal, 'pswp__share-modal--fade-in');
					setTimeout(function () {
						if (_shareModalHidden) {
							_toggleShareModalClass();
						}
					}, 300);
				}

				if (!_shareModalHidden) {
					_updateShareURLs();
				}
				return false;
			},
			_openWindowPopup = function (e) {
				e = e || window.event;
				var target = e.target || e.srcElement;

				pswp.shout('shareLinkClick', e, target);

				if (!target.href) {
					return false;
				}

				if (target.hasAttribute('download')) {
					return true;
				}

				window.open(
					target.href,
					'pswp_share',
					'scrollbars=yes,resizable=yes,toolbar=no,' +
						'location=yes,width=550,height=420,top=100,left=' +
						(window.screen ? Math.round(screen.width / 2 - 275) : 100)
				);

				if (!_shareModalHidden) {
					_toggleShareModal();
				}

				return false;
			},
			_updateShareURLs = function () {
				var shareButtonOut = '',
					shareButtonData,
					shareURL,
					image_url,
					page_url,
					share_text;

				for (var i = 0; i < _options.shareButtons.length; i++) {
					shareButtonData = _options.shareButtons[i];

					image_url = _options.getImageURLForShare(shareButtonData);
					page_url = _options.getPageURLForShare(shareButtonData);
					share_text = _options.getTextForShare(shareButtonData);

					shareURL = shareButtonData.url
						.replace('{{url}}', encodeURIComponent(page_url))
						.replace('{{image_url}}', encodeURIComponent(image_url))
						.replace('{{raw_image_url}}', image_url)
						.replace('{{text}}', encodeURIComponent(share_text));

					shareButtonOut +=
						'<a href="' +
						shareURL +
						'" target="_blank" ' +
						'class="pswp__share--' +
						shareButtonData.id +
						'"' +
						(shareButtonData.download ? 'download' : '') +
						'>' +
						shareButtonData.label +
						'</a>';

					if (_options.parseShareButtonOut) {
						shareButtonOut = _options.parseShareButtonOut(shareButtonData, shareButtonOut);
					}
				}
				_shareModal.children[0].innerHTML = shareButtonOut;
				_shareModal.children[0].onclick = _openWindowPopup;
			},
			_hasCloseClass = function (target) {
				for (var i = 0; i < _options.closeElClasses.length; i++) {
					if (framework.hasClass(target, 'pswp__' + _options.closeElClasses[i])) {
						return true;
					}
				}
			},
			_idleInterval,
			_idleTimer,
			_idleIncrement = 0,
			_onIdleMouseMove = function () {
				clearTimeout(_idleTimer);
				_idleIncrement = 0;
				if (_isIdle) {
					ui.setIdle(false);
				}
			},
			_onMouseLeaveWindow = function (e) {
				e = e ? e : window.event;
				var from = e.relatedTarget || e.toElement;
				if (!from || from.nodeName === 'HTML') {
					clearTimeout(_idleTimer);
					_idleTimer = setTimeout(function () {
						ui.setIdle(true);
					}, _options.timeToIdleOutside);
				}
			},
			_setupFullscreenAPI = function () {
				if (_options.fullscreenEl && !framework.features.isOldAndroid) {
					if (!_fullscrenAPI) {
						_fullscrenAPI = ui.getFullscreenAPI();
					}
					if (_fullscrenAPI) {
						framework.bind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
						ui.updateFullscreen();
						framework.addClass(pswp.template, 'pswp--supports-fs');
					} else {
						framework.removeClass(pswp.template, 'pswp--supports-fs');
					}
				}
			},
			_setupLoadingIndicator = function () {
				// Setup loading indicator
				if (_options.preloaderEl) {
					_toggleLoadingIndicator(true);

					_listen('beforeChange', function () {
						clearTimeout(_loadingIndicatorTimeout);

						// display loading indicator with delay
						_loadingIndicatorTimeout = setTimeout(function () {
							if (pswp.currItem && pswp.currItem.loading) {
								if (!pswp.allowProgressiveImg() || (pswp.currItem.img && !pswp.currItem.img.naturalWidth)) {
									// show preloader if progressive loading is not enabled,
									// or image width is not defined yet (because of slow connection)
									_toggleLoadingIndicator(false);
									// items-controller.js function allowProgressiveImg
								}
							} else {
								_toggleLoadingIndicator(true); // hide preloader
							}
						}, _options.loadingIndicatorDelay);
					});
					_listen('imageLoadComplete', function (index, item) {
						if (pswp.currItem === item) {
							_toggleLoadingIndicator(true);
						}
					});
				}
			},
			_toggleLoadingIndicator = function (hide) {
				if (_loadingIndicatorHidden !== hide) {
					_togglePswpClass(_loadingIndicator, 'preloader--active', !hide);
					_loadingIndicatorHidden = hide;
				}
			},
			_applyNavBarGaps = function (item) {
				var gap = item.vGap;
				var bars = _options.barsSize;

				if (_fitControlsInViewport()) {
					if (_options.captionEl && bars.bottom === 'auto') {
						if (!_fakeCaptionContainer) {
							_fakeCaptionContainer = framework.createElement('pswp__caption pswp__caption--fake');
							_fakeCaptionContainer.appendChild(framework.createElement('pswp__caption__center'));
							_controls.insertBefore(_fakeCaptionContainer, _captionContainer);
							framework.addClass(_controls, 'pswp__ui--fit');
						}
						if (_options.addCaptionHTMLFn(item, _fakeCaptionContainer, true)) {
							var captionSize = _fakeCaptionContainer.clientHeight;
							gap.bottom = parseInt(captionSize, 10) || 44;
						} else {
							gap.bottom = bars.top; // if no caption, set size of bottom gap to size of top
						}
					} else {
						gap.bottom = bars.bottom === 'auto' ? 0 : bars.bottom;
					}

					// height of top bar is static, no need to calculate it
					gap.top = bars.top;
				} else {
					gap.top = gap.bottom = 0;
				}
			},
			_setupIdle = function () {
				// Hide controls when mouse is used
				if (_options.timeToIdle) {
					_listen('mouseUsed', function () {
						framework.bind(document, 'mousemove', _onIdleMouseMove);
						framework.bind(document, 'mouseout', _onMouseLeaveWindow);

						_idleInterval = setInterval(function () {
							_idleIncrement++;
							if (_idleIncrement === 2) {
								ui.setIdle(true);
							}
						}, _options.timeToIdle / 2);
					});
				}
			},
			_overrideOptionsIfAllowLongCaptionsTrue = function () {
				if (_options.closeOnScroll) {
					console.info('FYI: Resetting _options.closeOnScroll to false because _options.allowLongCaptions is true.');
					_options.closeOnScroll = false;
				}
				if (_options.closeOnVerticalDrag) {
					console.info('FYI: Resetting _options.closeOnVerticalDrag to false because _options.allowLongCaptions is true.');
					_options.closeOnVerticalDrag = false;
				}
			},
			_setupHidingControlsDuringGestures = function () {
				// Hide controls on vertical drag
				_listen('onVerticalDrag', function (now) {
					if (_options.allowLongCaptions) {
						return;
					}

					if (_controlsVisible && now < 0.95) {
						ui.hideControls();
					} else if (!_controlsVisible && now >= 0.95) {
						ui.showControls();
					}
				});

				// Hide controls when pinching to close
				var pinchControlsHidden;
				_listen('onPinchClose', function (now) {
					if (_controlsVisible && now < 0.9) {
						ui.hideControls();
						pinchControlsHidden = true;
					} else if (pinchControlsHidden && !_controlsVisible && now > 0.9) {
						ui.showControls();
					}
				});

				_listen('zoomGestureEnded', function () {
					pinchControlsHidden = false;
					if (pinchControlsHidden && !_controlsVisible) {
						ui.showControls();
					}
				});
			};

		// From https://davidwalsh.name/add-rules-stylesheets
		var _createStylesheet = function () {
			var style = document.createElement('style');
			style.appendChild(document.createTextNode(''));
			document.head.appendChild(style);
			return style.sheet;
		};

		var _createStylesForLongCaptions = function () {
			// Make a new stylesheet since there will be cross-site security issues if referencing a stylesheet on CDN
			_stylesheet = _createStylesheet();

			// From https://davidwalsh.name/add-rules-stylesheets
			// We insert an empty rule just to create a new CSSStyleRule object. The second param is the index to
			// insert at using the length property we effectively "append" the rule to the end of the sheet.
			var ruleExpandedIndex = _stylesheet.insertRule('.pswp__caption__center.expanded {}', _stylesheet.cssRules.length);
			var ruleCollapsedIndex = _stylesheet.insertRule('.pswp__caption__center.collapsed {}', _stylesheet.cssRules.length);
			_ruleExpanded = _stylesheet.cssRules.item(ruleExpandedIndex);
			_ruleCollapsed = _stylesheet.cssRules.item(ruleCollapsedIndex);

			// While we are here, increase the width of the caption. It is very narrow which keeps it roughly centered
			// if there are only a few words but it looks odd when the photo is wide and the caption is long.
			_stylesheet.insertRule('.pswp__caption__center { width: 100%; max-width: 720px; }', _stylesheet.cssRules.length);
		};

		var _uiElements = [
			{
				name: 'caption',
				option: 'captionEl',
				onInit: function (el) {
					_captionContainer = el;
				}
			},
			{
				name: 'share-modal',
				option: 'shareEl',
				onInit: function (el) {
					_shareModal = el;
				},
				onTap: function () {
					_toggleShareModal();
				}
			},
			{
				name: 'button--share',
				option: 'shareEl',
				onInit: function (el) {
					_shareButton = el;
				},
				onTap: function () {
					_toggleShareModal();
				}
			},
			{
				name: 'button--download',
				option: 'downloadEl',
				onInit: function (el) {
					_downloadButton = el;
				},
				onTap: _downloadFile
			},
			{
				name: 'button--zoom',
				option: 'zoomEl',
				onTap: pswp.toggleDesktopZoom
			},
			{
				name: 'counter',
				option: 'counterEl',
				onInit: function (el) {
					_indexIndicator = el;
				}
			},
			{
				name: 'button--close',
				option: 'closeEl',
				onTap: function () {
					setTimeout(pswp.close);
				}
			},
			{
				name: 'button--arrow--left',
				option: 'arrowEl',
				onInit: function (el) {
					_prevButton = el;
				},
				onTap: pswp.prev
			},
			{
				name: 'button--arrow--right',
				option: 'arrowEl',
				onInit: function (el) {
					_nextButton = el;
				},
				onTap: pswp.next
			},
			{
				name: 'button--fs',
				option: 'fullscreenEl',
				onTap: function () {
					if (_fullscrenAPI.isFullscreen()) {
						_fullscrenAPI.exit();
					} else {
						_fullscrenAPI.enter();
					}
				}
			},
			{
				name: 'button--caption--ctrl',
				option: 'allowLongCaptions',
				onTap: function (el) {
					_toggleCaption(el);
				}
			},
			{
				name: 'preloader',
				option: 'preloaderEl',
				onInit: function (el) {
					_loadingIndicator = el;
				}
			}
		];

		var _ensureCaptionCtrlExists = function () {
			// Ensure that there is a button to toggle the caption
			var captionElement = document.querySelector('.pswp__caption');
			if (!captionElement.querySelector('.pswp__button--caption--ctrl')) {
				var btn = document.createElement('button');
				var innerCaptionElement = captionElement.querySelector('.pswp__caption__center');
				btn.setAttribute('class', 'pswp__button pswp__button--caption--ctrl');
				btn.setAttribute('id', 'pswp__button--caption--ctrl');
				btn.setAttribute('title', 'Expand caption');
				captionElement.insertBefore(btn, innerCaptionElement);
			}
		};

		var _setupUIElements = function () {
			var item, classAttr, uiElement;

			var loopThroughChildElements = function (sChildren) {
				if (!sChildren) {
					return;
				}

				var l = sChildren.length;
				for (var i = 0; i < l; i++) {
					item = sChildren[i];
					classAttr = item.className;

					for (var a = 0; a < _uiElements.length; a++) {
						uiElement = _uiElements[a];

						if (classAttr.indexOf('pswp__' + uiElement.name) > -1) {
							if (_options[uiElement.option]) {
								// if element is not disabled from options

								framework.removeClass(item, 'pswp__element--disabled');
								if (uiElement.onInit) {
									uiElement.onInit(item);
								}

								//item.style.display = 'block';
							} else {
								framework.addClass(item, 'pswp__element--disabled');
								//item.style.display = 'none';
							}
						}
					}
				}
			};
			loopThroughChildElements(_controls.children);

			var topBar = framework.getChildByClass(_controls, 'pswp__top-bar');
			if (topBar) {
				loopThroughChildElements(topBar.children);
			}

			_ensureCaptionCtrlExists();
		};

		ui.init = function () {
			// extend options
			framework.extend(pswp.options, _defaultUIOptions, true);

			// create local link for fast access
			_options = pswp.options;

			// find pswp__ui element
			_controls = framework.getChildByClass(pswp.scrollWrap, 'pswp__ui');

			// create local link
			_listen = pswp.listen;

			_overrideOptionsIfAllowLongCaptionsTrue();
			_setupHidingControlsDuringGestures();

			// update controls when slides change
			_listen('beforeChange', ui.update);

			// toggle zoom on double-tap
			_listen('doubleTap', function (point) {
				var initialZoomLevel = pswp.currItem.initialZoomLevel;
				if (pswp.getZoomLevel() !== initialZoomLevel) {
					pswp.zoomTo(initialZoomLevel, point, 333);
				} else {
					pswp.zoomTo(_options.getDoubleTapZoom(false, pswp.currItem), point, 333);
				}
			});

			// Allow text selection in caption
			_listen('preventDragEvent', function (e, isDown, preventObj) {
				var t = e.target || e.srcElement;
				if (
					t &&
					t.nodeType === 1 &&
					t.getAttribute('class') &&
					e.type.indexOf('mouse') > -1 &&
					(t.getAttribute('class').indexOf('__caption') > 0 || /(SMALL|STRONG|EM)/i.test(t.tagName))
				) {
					preventObj.prevent = false;
					_stopAllAnimations();
				}
			});

			// bind events for UI
			_listen('bindEvents', function () {
				framework.bind(_controls, 'pswpTap click', _onControlsTap);
				framework.bind(pswp.scrollWrap, 'pswpTap', ui.onGlobalTap);

				if (!pswp.likelyTouchDevice) {
					framework.bind(pswp.scrollWrap, 'mouseover', ui.onMouseOver);
				}
			});

			// unbind events for UI
			_listen('unbindEvents', function () {
				if (!_shareModalHidden) {
					_toggleShareModal();
				}
				if (_idleInterval) {
					clearInterval(_idleInterval);
				}
				framework.unbind(document, 'mouseout', _onMouseLeaveWindow);
				framework.unbind(document, 'mousemove', _onIdleMouseMove);
				framework.unbind(_controls, 'pswpTap click', _onControlsTap);
				framework.unbind(pswp.scrollWrap, 'pswpTap', ui.onGlobalTap);
				framework.unbind(pswp.scrollWrap, 'mouseover', ui.onMouseOver);

				if (_fullscrenAPI) {
					framework.unbind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
					if (_fullscrenAPI.isFullscreen()) {
						_options.hideAnimationDuration = 0;
						_fullscrenAPI.exit();
					}
					_fullscrenAPI = null;
				}
			});

			// clean up things when gallery is destroyed
			_listen('destroy', function () {
				if (_options.captionEl) {
					if (_fakeCaptionContainer) {
						_controls.removeChild(_fakeCaptionContainer);
					}
					framework.removeClass(_captionContainer, 'pswp__caption--empty');
				}

				if (_shareModal) {
					_shareModal.children[0].onclick = null;
				}
				framework.removeClass(_controls, 'pswp__ui--over-close');
				framework.addClass(_controls, 'pswp__ui--hidden');
				ui.setIdle(false);
			});

			if (!_options.showAnimationDuration) {
				framework.removeClass(_controls, 'pswp__ui--hidden');
			}
			_listen('initialZoomIn', function () {
				if (_options.showAnimationDuration) {
					framework.removeClass(_controls, 'pswp__ui--hidden');
				}
			});
			_listen('initialZoomOut', function () {
				framework.addClass(_controls, 'pswp__ui--hidden');
			});

			_listen('parseVerticalMargin', _applyNavBarGaps);

			_setupUIElements();

			if (_options.shareEl && _shareButton && _shareModal) {
				_shareModalHidden = true;
			}

			_countNumItems();

			_setupIdle();

			_setupFullscreenAPI();

			_setupLoadingIndicator();

			if (_options.allowLongCaptions) {
				_createStylesForLongCaptions();
			}
		};

		ui.setIdle = function (isIdle) {
			_isIdle = isIdle;
			_togglePswpClass(_controls, 'ui--idle', isIdle);
		};

		ui.update = function () {
			// Don't update UI if it's hidden
			if (_controlsVisible && pswp.currItem) {
				ui.updateIndexIndicator();

				if (_options.captionEl) {
					var captionExists = _options.addCaptionHTMLFn(pswp.currItem, _captionContainer);

					_togglePswpClass(_captionContainer, 'caption--empty', !captionExists);
				}

				_overlayUIUpdated = true;
			} else {
				_overlayUIUpdated = false;
			}

			if (!_shareModalHidden) {
				_toggleShareModal();
			}

			_countNumItems();
		};

		ui.updateFullscreen = function (e) {
			if (e) {
				// some browsers change window scroll position during the fullscreen
				// so PhotoSwipe updates it just in case
				setTimeout(function () {
					pswp.setScrollOffset(0, framework.getScrollY());
				}, 50);
			}

			// toogle pswp--fs class on root element
			framework[(_fullscrenAPI.isFullscreen() ? 'add' : 'remove') + 'Class'](pswp.template, 'pswp--fs');
		};

		ui.updateIndexIndicator = function () {
			if (_options.counterEl) {
				_indexIndicator.innerHTML = pswp.getCurrentIndex() + 1 + _options.indexIndicatorSep + _options.getNumItemsFn();
			}
			if (!_options.loop) {
				if (pswp.getCurrentIndex() === 0) {
					framework.addClass(_prevButton, 'pswp__element--disabled');
				} else {
					framework.removeClass(_prevButton, 'pswp__element--disabled');
				}
				if (pswp.getCurrentIndex() === _options.getNumItemsFn() - 1) {
					framework.addClass(_nextButton, 'pswp__element--disabled');
				} else {
					framework.removeClass(_nextButton, 'pswp__element--disabled');
				}
			}
		};

		ui.onGlobalTap = function (e) {
			e = e || window.event;
			var target = e.target || e.srcElement;

			if (_blockControlsTap) {
				return;
			}

			if (e.detail && e.detail.pointerType === 'mouse') {
				// Silently ignore right-click events.
				if (!e.detail.rightClick) {
					// close gallery if clicked outside of the image
					if (_options.closeOnOutsideClick && _hasCloseClass(target)) {
						pswp.close();
						return;
					}

					if (framework.hasClass(target, 'pswp__img')) {
						if (pswp.getZoomLevel() === 1 && pswp.getZoomLevel() <= pswp.currItem.fitRatio) {
							if (_options.clickToCloseNonZoomable) {
								pswp.close();
							} else if (_options.clickToShowNextNonZoomable) {
								pswp.next();
							}
						} else {
							pswp.toggleDesktopZoom(e.detail.releasePoint);
						}
					}
				}
			} else {
				// Tap anywhere (except buttons and caption) to toggle visibility of controls
				// Since the caption may now contain other elements, have to check if target is in caption
				var targetCaption = target.closest('.pswp__caption');
				if (_options.tapToToggleControls && !targetCaption) {
					if (_controlsVisible) {
						ui.hideControls();
					} else {
						ui.showControls();
					}
				}

				// tap to close gallery
				if (
					_options.tapToClose &&
					(framework.hasClass(target, 'pswp__img') || (_options.closeOnOutsideClick && _hasCloseClass(target)))
				) {
					pswp.close();
					return;
				}
			}
		};
		ui.onMouseOver = function (e) {
			e = e || window.event;
			var target = e.target || e.srcElement;

			// add class when mouse is over an element that should close the gallery
			_togglePswpClass(_controls, 'ui--over-close', _hasCloseClass(target));
		};

		ui.hideControls = function () {
			framework.addClass(_controls, 'pswp__ui--hidden');
			_controlsVisible = false;
		};

		ui.showControls = function () {
			_controlsVisible = true;
			if (!_overlayUIUpdated) {
				ui.update();
			}
			framework.removeClass(_controls, 'pswp__ui--hidden');
		};

		ui.supportsFullscreen = function () {
			var d = document;
			return !!(d.exitFullscreen || d.mozCancelFullScreen || d.webkitExitFullscreen || d.msExitFullscreen);
		};

		ui.getFullscreenAPI = function () {
			var dE = document.documentElement,
				api,
				tF = 'fullscreenchange';

			if (dE.requestFullscreen) {
				api = {
					enterK: 'requestFullscreen',
					exitK: 'exitFullscreen',
					elementK: 'fullscreenElement',
					eventK: tF
				};
			} else if (dE.mozRequestFullScreen) {
				api = {
					enterK: 'mozRequestFullScreen',
					exitK: 'mozCancelFullScreen',
					elementK: 'mozFullScreenElement',
					eventK: 'moz' + tF
				};
			} else if (dE.webkitRequestFullscreen) {
				api = {
					enterK: 'webkitRequestFullscreen',
					exitK: 'webkitExitFullscreen',
					elementK: 'webkitFullscreenElement',
					eventK: 'webkit' + tF
				};
			} else if (dE.msRequestFullscreen) {
				api = {
					enterK: 'msRequestFullscreen',
					exitK: 'msExitFullscreen',
					elementK: 'msFullscreenElement',
					eventK: 'MSFullscreenChange'
				};
			}

			if (api) {
				api.enter = function () {
					// disable close-on-scroll in fullscreen
					_initalCloseOnScrollValue = _options.closeOnScroll;
					_options.closeOnScroll = false;

					if (this.enterK === 'webkitRequestFullscreen') {
						pswp.template[this.enterK](Element.ALLOW_KEYBOARD_INPUT);
					} else {
						return pswp.template[this.enterK]();
					}
				};
				api.exit = function () {
					_options.closeOnScroll = _initalCloseOnScrollValue;

					return document[this.exitK]();
				};
				api.isFullscreen = function () {
					return document[this.elementK];
				};
			}

			return api;
		};

		ui.toggleCaption = function (el) {
			_toggleCaption(el);
		};

		ui.resetCaption = function (el) {
			_resetCaption(el);
		};
	};
	return PhotoSwipeUI_Default;
});
