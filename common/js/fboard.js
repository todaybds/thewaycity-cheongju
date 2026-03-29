/////////////////////////////////////////////////////////////////////////////////////
/// 글 리스트 ///////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

// 전체 글 선택
var checkflag = "false";
function myall() {
  arrlength = document.tmform.list.length;
  if (arrlength >= 1) {
    for (i=0;i<arrlength;i++){	
      if(document.tmform.list[i].checked)
        document.tmform.list[i].checked = false;
      else
        document.tmform.list[i].checked = true;
    }
  }else{
    if(document.tmform.list.checked)
      document.tmform.list.checked = false;
    else
      document.tmform.list.checked = true;
  }
}

// 전체 글 선택2
function myall2() {
  arrlength = document.all.etc2.length;
  if (arrlength >= 1) {
    if(document.all.showCheck.checked == false) {
      for (i = 0; i < arrlength; i++) document.all.etc2[i].checked = false;
      document.all.showCheck.checked == false;
    } else {
      for (i = 0; i < arrlength; i++) document.all.etc2[i].checked = true;
      document.all.showCheck.checked == true;
    }
  } else {
    if(document.all.showCheck.checked == false) {
      document.all.etc2.checked = false;
    } else {
      document.all.etc2.checked = true;
    }
  }
}

// 글 검색
function tmsearch() {
  if (document.tmform.searchName.value == "") {
    alert("검색하려는 단어를 입력해 주십시요");
    document.tmform.searchName.focus();
    return false;
  }
  return true;
}

function tmsearch2() {
  document.tmform.submit();
}

// 페이지 이동
function gogo(val) {
  document.tmform.action = val;
  document.tmform.submit();
}

// 선택글 삭제
function select_del() {
  var list_ea = 0;
  list_length = document.tmform.list.length;
  if (typeof(list_length) != 'undefined') {           // 항목이 여러개일때
    for (i=0; i<list_length; i++) {
      if (document.tmform.list[i].checked == true) {
        list_ea = list_ea + 1
      }
    }
  } else {                                            // 항목이 하나일때
    if (document.tmform.list.checked == true) {
      list_ea = list_ea + 1
    }
  }
  if (list_ea == 0){
    alert('한개이상 선택해주세요.');
    return false;
  }
  var confirm_value = confirm("삭제 하겠습니까?\n삭제시 복구 불가능 합니다.");
  if(confirm_value) {
    document.tmform.action = '../../../fboard/common/delete_ok.php';
    document.tmform.submit();
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// 글보기 ///////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
function modify_go(cIdx, fboard, b_num, fpage) {
  $("#actionMode").val("modify_password");
  document.tmform_view.action = "?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&actionMode=modify_password&fpage="+fpage;
  document.tmform_view.submit();
}

function modify_go2(cIdx, fboard, b_num, fpage) {
  location.href = "?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&actionMode=modify&fpage="+fpage;
}

function delete_go(cIdx, fboard, b_num, fpage) {
  var confirm_value = confirm("삭제 하겠습니까?\n삭제시 복구 불가능 합니다.");
  if(confirm_value) {
    $("#actionMode").val("delete_password");
    document.tmform_view.action = "?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&actionMode=delete_password&fpage="+fpage;
    document.tmform_view.submit();
    return false;
  } else {
    return false;
  }
}

function delete_go2(cIdx, fboard, b_num, fpage) {
  var confirm_value = confirm("삭제 하겠습니까?\n삭제시 복구 불가능 합니다.");
  if(confirm_value) {
    location.href = "?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&actionMode=delete&fpage="+fpage;
    return false;
  }
}

function delete_go3(cIdx, fboard, b_num, fpage, fboard_dir, pageName) {
  var confirm_value = confirm("삭제 하겠습니까?\n삭제시 복구 불가능 합니다.");
  if(confirm_value) {
    location.href = fboard_dir+"/delete_ok.php?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&actionMode=delete&fpage="+fpage+"&pageName="+pageName;
    return false;
  }
}

function comment_write() {
  if (document.tmform_view.fc_name.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("이름을 입력해 주세요");
    document.tmform_view.fc_name.focus();
    return false;
  }
  if (document.tmform_view.fc_writepass.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("비밀번호를 입력해 주세요");
    document.tmform_view.fc_writepass.focus();
    return false;
  }
  if (document.tmform_view.fc_contents.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("내용을 입력해 주세요");
    document.tmform_view.fc_contents.focus();
    return false;
  }
  if (document.tmform_view.fc_contents.length > 50) {
    alert("한줄 답변글 내용은 50자 내외로 입력해 주세요");
    document.tmform_view.fc_contents.focus();
    return false;
  }
  $("#actionMode").val("comment_ok");
  document.tmform_view.action = "?actionMode=comment_ok";
  document.tmform_view.submit();
}

function comment_password(cIdx, fboard, b_num, fc_idx, pageName) {
  var url="/pg/fboard/common/comment_password.php?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&fc_idx="+fc_idx+"&pageName="+pageName;
  window.open(url, 'comment_password', 'left=200, top=150, width=230, height=90, toolbar=no, menubar=no, status=no, scroolbars=no, resizable=no')
}

function print_gogo() {
  window.print();
}

/////////////////////////////////////////////////////////////////////////////////////////////
// 글쓰기 ///////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
function write_default_ok() {
  if (document.tmform.b_title.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("제목을 입력해 주세요");
    document.tmform.b_title.focus();
    return false;
  }
  if (document.tmform.b_name.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("작성자를 입력해 주세요");
    document.tmform.b_name.focus();
    return false;
  }
  /*
  if (document.tmform.b_writepass.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("비밀번호를 입력해 주세요. 삭제및 수정시 필요합니다.");
    document.tmform.b_writepass.focus();
    return false;
  }
  */
  /*
  if(document.tmform.b_html.value != "2") {
    if (document.tmform.b_contents.value == "") {
      alert("내용을 입력해 주세요");
      document.tmform.b_contents.focus();
      return false;
    }
  }
  */
  return true;
}

function write_default_ok2() {
  if (document.tmform.b_title.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("제목을 입력해 주세요");
    document.tmform.b_title.focus();
    return false;
  }
  if(document.tmform.b_html.value != "2") {
    if (document.tmform.b_contents.value == "") {
      alert("내용을 입력해 주세요");
      document.tmform.b_contents.focus();
      return false;
    }
  }
  return true;
}

function write_default_ok3() {
  if (document.tmform.b_title.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("제목을 입력해 주세요");
    document.tmform.b_title.focus();
    return false;
  }
  return true;
}

function write_gallery_ok(actionMode) {
  if (document.tmform.b_title.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("제목을 입력해 주세요");
    document.tmform.b_title.focus();
    return false;
  }
  if (document.tmform.b_name.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("작성자를 입력해 주세요");
    document.tmform.b_name.focus();
    return false;
  }
  if (document.tmform.b_writepass.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("비밀번호를 입력해 주세요. 삭제및 수정시 필요합니다.");
    document.tmform.b_writepass.focus();
    return false;
  }
  if (actionMode != 'modify') {
    if (document.tmform.fileName1.value == "") {
      alert("사진게시판일 경우 사진파일을 올려야 합니다.\n파일을 선택해주세요.");
      document.tmform.fileName1.focus();
      return false;
    }
  }
  return true;
}

function fileDelete_go(cIdx, fboard, b_num, no) {
  var confirm_value = confirm("파일을 삭제 하겠습니까?\n삭제시 복원 불가능 합니다.");
  if(confirm_value) {
    location.href = "?cIdx="+cIdx+"&fboard="+fboard+"&b_num="+b_num+"&no="+no+"&actionMode=fileDelete";
    return false;
  }
}


/////////////////////////////////////////////////////////////////////////////////////////////
// 기타 ///////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
// 이미지 사이즈조절 1
function resize(obj, objsrc) {
  var obj = obj;
  var ImgName = objsrc;
  
  nImg = new Image();
  nImg.src = ImgName;

  wid = nImg.width; //이미지의 원래 너비값
  hit = nImg.height; //이미지의 원래 높이값

  if(wid > hit) { //너비가 높이보다 클경우
    if(wid > 155 ) { // 정해진 너비보다 클경우
	  x = (hit * 120) / wid
      obj.width=155;
      obj.height=x; //이미지에 적용
    }
  } else {		
    if(hit > 75 ) { //정해진 높이보다 클경우
      x = (wid * 75) / hit
      obj.width=x;
      obj.height=75; //이미지에 적용
    }
  }		
}
// 이미지 사이즈 조절 2
function resize2(obj, objsrc) {
  var obj = obj;
  var ImgName = objsrc;
  
  nImg = new Image();
  nImg.src = ImgName;

  wid = nImg.width; //이미지의 원래 너비값
  hit = nImg.height; //이미지의 원래 높이값

  if(wid > hit) { //너비가 높이보다 클경우
    if(wid > 600 ) { // 정해진 너비보다 클경우
      x = (hit * 600) / wid
      obj.width = 600;
      obj.height = x; //이미지에 적용
    }
  } else {		
    if(hit > 1000 ) { //정해진 높이보다 클경우
      x = (wid * 1000) / hit
      obj.width = x;
      obj.height = 1000; //이미지에 적용
    }
  }		
}

// 이미지 사이즈조절 3 (image_width=이미지넓이, image_height=이미지높이)
function resize3(obj, objsrc, image_width, image_height) {
  var obj = obj;
  var ImgName = objsrc;
  var image_width = image_width;
  var image_height = image_height;
  
  nImg = new Image();
  nImg.src = ImgName;

  wid = nImg.width; //이미지의 원래 너비값
  hit = nImg.height; //이미지의 원래 높이값

  if(wid > hit) { //너비가 높이보다 클경우
    if(wid > image_width ) { // 정해진 너비보다 클경우
	  x = (hit * image_width) / wid
      obj.width=image_width;
      obj.height=x; //이미지에 적용
    }
  } else {		
    if(hit > image_height ) { //정해진 높이보다 클경우
      x = (wid * image_height) / hit
      obj.width=x;
      obj.height=image_height; //이미지에 적용
    }
  }		
}

// 우편번호 검색 (도로명주소)
function post_check(post, address1, address2) {
  window.open('/pg/fboard/common/jusoPopup.php?post='+ post +'&address1='+ address1 +'&address2='+ address2, 'zipcode', 'resizable=no, status=no, scrollbars=yes, toolbar=no, menubar=no, width=570px, height=420px');
}

// 우편번호 검색 (다음)
function openDaumPostcode(post, address1, address2) {
  new daum.Postcode({
    oncomplete: function(data) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.
        // 우편번호와 주소 정보를 해당 필드에 넣고, 커서를 상세주소 필드로 이동한다.
        //전체 주소에서 연결 번지 및 ()로 묶여 있는 부가정보를 제거하고자 할 경우,
        //아래와 같은 정규식을 사용해도 된다. 정규식은 개발자의 목적에 맞게 수정해서 사용 가능하다.
        var address = data.address.replace(/(\s|^)\(.+\)$|\S+~\S+/g, '');
        document.getElementById(post).value = data.zonecode;
        document.getElementById(address1).value = address;
        document.getElementById(address2).focus();
    }
  }).open();
}

// 숫자 인지 체크
function number_check(id) {
	var data = $("#"+id+"").val();
  //alert(value);	
  if(data) {
    if(!($.isNumeric(data))){
      alert("숫자만 입력해 주세요")
      $("#"+id+"").val("");
      $("#"+id+"").fucus();
    }
  }
}

function number_check2(id, opt){
  // 좌우 trim(공백제거)을 해준다.
  var num = $("#"+id+"").val();
  num = String(num).replace(/^\s+|\s+$/g, "");

  if(typeof opt == "undefined" || opt == "1"){
    // 모든 10진수 (부호 선택, 자릿수구분기호 선택, 소수점 선택)
    var regex = /^[+\-]?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+){1}(\.[0-9]+)?$/g;
  }else if(opt == "2"){
    // 부호 미사용, 자릿수구분기호 선택, 소수점 선택
    var regex = /^(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+){1}(\.[0-9]+)?$/g;
  }else if(opt == "3"){
    // 부호 미사용, 자릿수구분기호 미사용, 소수점 선택
    var regex = /^[0-9]+(\.[0-9]+)?$/g;
  }else{
    // only 숫자만(부호 미사용, 자릿수구분기호 미사용, 소수점 미사용)
    var regex = /^[0-9]$/g;
  }

  if( regex.test(num) ){
    num = num.replace(/,/g, "");
    return isNaN(num) ? false : true;
  } else { 
    alert("숫자만 입력해 주세요.");
    $("#"+id+"").val("");
    return false;  
  }
}

//숫자 3자리마다 콤마(,)넣기
function number_format(str) {
	str = str.toString(); //문자형으로 변환
	var str_end = "";
	//소수점이 있는 경우
	if(str.indexOf('.') != -1) {
		str_arr = str.split(".");
		str = str_arr[0];
	  str_end = "." + str_arr[1];
	}

	str = str.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return str+str_end;
}

// 로그인
function login_ok(){
  if (document.all.m_id.value == "") {
	alert("아이디를 입력해 주세요.");
	document.all.m_id.focus();
	return false;
  }
  if (document.all.m_password.value == "") {
	alert("비밀번호를 입력해 주세요.");
	document.all.m_password.focus();
	return false;
  }
  return true;
}