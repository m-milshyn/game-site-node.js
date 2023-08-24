(function ($) {
	"use strict";
	// Page loading animation
	let width = $(window).width();
	$(window).resize(function () {
		if (width > 992 && $(window).width() < 992) {
			location.reload();
		}
		else if (width < 992 && $(window).width() > 992) {
			location.reload();
		}
	})
	// Menu Dropdown Toggle
	if ($('.menu-trigger').length) {
		$(".menu-trigger").on('click', function () {
			$(this).toggleClass('active');
			$('.header-area .nav').slideToggle(200);
		});
	}
})(window.jQuery);