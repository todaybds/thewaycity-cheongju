$(function () {
  // 관심고객등록 페이지에서는 제외
  if (/\/wish\//.test(location.pathname)) return;
  // 메인페이지 제외
  if (location.pathname === '/' || /\/index\.htm/i.test(location.pathname)) return;
  // 모바일만 (1099px 이하)
  if (window.innerWidth > 1099) return;

  var bar = $(
    '<div id="mo-bottom-bar">' +
      '<a href="/wish/wish.php" class="mo-bb-link mo-bb-wish">관심고객등록(방문예약)</a>' +
      '<a href="tel:1833-6809" class="mo-bb-link mo-bb-tel">1833-6809</a>' +
    '</div>'
  );

  $('body').append(bar).css('padding-bottom', '50px');
});
