/**
 * tap.js:
 *
 * Displatches tap and double-tap events.
 *
 */

var tapTimer,
	tapReleasePoint = {},
	_dispatchTapEvent = function (origEvent, releasePoint, pointerType) {
		var e = document.createEvent('CustomEvent'),
			eDetail = {
				origEvent: origEvent,
				pointerType: pointerType || 'touch',
				releasePoint: releasePoint,
				target: origEvent.target,
				rightClick: pointerType === 'mouse' && origEvent.which === 3
			};

		e.initCustomEvent('pswpTap', true, true, eDetail);
		origEvent.target.dispatchEvent(e);
	};

_registerModule('Tap', {
	publicMethods: {
		initTap: function () {
			_listen('firstTouchStart', self.onTapStart);
			_listen('touchRelease', self.onTapRelease);
			_listen('destroy', function () {
				tapReleasePoint = {};
				tapTimer = null;
			});
		},
		onTapStart: function (touchList) {
			if (touchList.length > 1) {
				clearTimeout(tapTimer);
				tapTimer = null;
			}
		},
		onTapRelease: function (e, releasePoint) {
			if (!releasePoint) {
				return;
			}

			if (!_moved && !_isMultitouch && !_numAnimations && (!_pointerEventEnabled || self.container.contains(e.target))) {
				var p0 = releasePoint;
				if (tapTimer) {
					clearTimeout(tapTimer);
					tapTimer = null;

					// Check if taped on the same place
					if (_isNearbyPoints(p0, tapReleasePoint)) {
						_shout('doubleTap', p0);
						return;
					}
				}

				if (releasePoint.type === 'mouse') {
					_dispatchTapEvent(e, releasePoint, 'mouse');
					return;
				}

				// Fix for share buttons zooming image.
				// @see https://github.com/dimsemenov/PhotoSwipe/issues/1198
				var clickedTagName = e.target.tagName.toUpperCase();
				if (clickedTagName === 'A') {
					return;
				}

				// avoid double tap delay on buttons and elements that have class pswp__single-tap
				if (clickedTagName === 'BUTTON' || framework.hasClass(e.target, 'pswp__single-tap')) {
					_dispatchTapEvent(e, releasePoint);
					return;
				}

				_equalizePoints(tapReleasePoint, p0);

				tapTimer = setTimeout(function () {
					_dispatchTapEvent(e, releasePoint);
					tapTimer = null;
				}, 300);
			}
		}
	}
});
