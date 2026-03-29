/////////////////////////////////////////////////////////////////////////////////////
/// 실명확인 ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

// 실명확인 체크2
function nameCheck2_gogo(actionMode) {
  if (document.tmform.agreement1.checked == false) {
    alert('이용약관을 읽고 동의버튼에 체크 해주세요.');
    document.tmform.agreement1.focus();
    return false;
  }
  if (document.tmform.agreement2.checked == false) {
    alert('개인정보취급방침을 읽고 동의버튼에 체크 해주세요.');
    document.tmform.agreement2.focus();
    return false;
  }
  return true;
}


// 실명확인 체크3 (14세 미만)
function nameCheck3_gogo() {
  if (document.tmform.agreement1.checked == false) {
    alert('이용약관을 읽고 동의버튼에 체크 해주세요.');
    document.tmform.agreement1.focus();
    return false;
  }
  if (document.tmform.agreement2.checked == false) {
    alert('개인정보취급방침을 읽고 동의버튼에 체크 해주세요.');
    document.tmform.agreement2.focus();
    return false;
  }
  if (document.tmform.agreement3.checked == false) {
    alert('어린이/학생 회원의 법정대리인임에 동의 해주세요.');
    document.tmform.agreement3.focus();
    return false;
  }
  return true;
}


// 실명인증, G-PIN 선택
function select_type(id){
  if(id == 'select_name') {
    document.getElementById('select_gpin').style.display='none';
    document.getElementById('select_name').style.display='block';
  }
  if(id == 'select_gpin') {
    document.getElementById('select_name').style.display='none';
    document.getElementById('select_gpin').style.display='block';
  }
}


/////////////////////////////////////////////////////////////////////////////////////
/// 회원가입 ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
// 영문자검사  대문자/ 소문자/ 숫자/ 특수문자
function isCase(input){
  var chars1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var chars2 = "abcdefghijklmnopqrstuvwxyz";
  var chars3 = "0123456789";
  //var chars4 = <>?;:\">'`!@#$%^&*()-=~_+\|,./<>?;:\"[]{} ';
  var chars4 = "<>?;:\">'`!@#$%^&*()-=~_+\|,./<>?;:\"[]{} '";
  return containsChar(input, chars1,chars2,chars3,chars4);
}
function containsChar(input,chars1,chars2,chars3,chars4){
  var cnt1 = 0;
  var cnt2 = 0;
  var cnt3 = 0;
  var cnt4 = 0;
  for(var inx=0; inx < input.length;inx++){
    if(chars1.indexOf(input.charAt(inx))!= -1){ cnt1++; }
    if(chars2.indexOf(input.charAt(inx))!= -1){ cnt2++; }
    if(chars3.indexOf(input.charAt(inx))!= -1){ cnt3++; }
    if(chars4.indexOf(input.charAt(inx))!= -1){ cnt4++; }
  }
  return (cnt1+"/"+cnt2+"/"+cnt3+"/"+cnt4);
}

// 회원가입
function join_gogo(actionMode) {
  if (document.tmform.m_name.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('이름을 입력해 주세요.');
    document.tmform.m_name.focus();
    return false;
  }
  if (document.tmform.m_id.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('아이디를 입력해 주세요.');
    document.tmform.m_id.focus();
    return false;
  }
  if (actionMode == "join_ok") {
    if (document.tmform.m_id.value.length < 6) {
      alert("아이디는 6자 이상이어야 합니다.");
      document.tmform.m_id.focus();
      return false;
    }
    for(i = 0; i < document.tmform.m_id.value.length; i++) {
      if( (document.tmform.m_id.value.charCodeAt(i) < 48 || document.tmform.m_id.value.charCodeAt(i) > 57) && (document.tmform.m_id.value.charCodeAt(i) < 65 ||  document.tmform.m_id.value.charCodeAt(i) > 90) && (document.tmform.m_id.value.charCodeAt(i) < 97 || document.tmform.m_id.value.charCodeAt(i) > 122)) {
        alert("사용할수 없는 문자가 섞여있습니다.!!\n\n아이디는 숫자 또는 영문으로만 이루어져야 합니다.!!");
        document.tmform.m_id.value = "";
        document.tmform.m_id.focus();
        return false;
      }
    }
	if (document.tmform.m_password1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('비밀번호를 입력해 주세요.');
      document.tmform.m_password1.focus();
      return false;
    }
    if (document.tmform.m_password1.value.length < 8) {
      alert("비밀번호는 8자 이상 대소문자, 숫자(0~9), 특수문자 중 3종류 이상으로 입력해주세요.");
      document.tmform.m_password1.focus();
      return false;
    }
    if (document.tmform.m_password2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('비밀번호를 입력해 주세요.');
      document.tmform.m_password2.focus();
      return false;
    }
    if (document.tmform.m_password1.value != document.tmform.m_password2.value) {
      alert("비밀번호가 동일하지 않습니다.");
      document.tmform.m_password1.focus();
      return false;
    }
    //var text = "abcd5fg";
    var text = document.tmform.m_password1.value;
    var s = (isCase(text));
    var s_1  = s.split("/");
    if(s_1[0]>0)s_1[0] = 1;
    if(s_1[1]>0)s_1[1] = 1;
    if(s_1[2]>0)s_1[2] = 1;
    if(s_1[3]>0)s_1[3] = 1;
    if((parseInt(s_1[0]) + parseInt(s_1[1]) + parseInt(s_1[2]) + parseInt(s_1[3])) < 2){
      alert("비밀번호는 영어대문자(A~Z), 영어소문자(a~z), 숫자(0~9), 특수문자중 2종류 이상으로 작성해 주세요.");
      document.tmform.m_password1.focus();
      return false;
    }
	/*
    if (document.tmform.m_question.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('비밀번호 분실시 질문을 선택해 주세요.');
      document.tmform.m_question.focus();
      return false;
    }
    if (document.tmform.m_answer.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('비밀번호 분실시 답변을 입력해 주세요.');
      document.tmform.m_answer.focus();
      return false;
    }
	*/
  }
  if (document.tmform.m_email1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('이메일주소 앞자리를 입력해 주세요.');
    document.tmform.m_email1.focus();
    return false;
  }
  if (document.tmform.m_email2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('이메일주소 뒷자리를 입력해 주세요.');
    document.tmform.m_email2.focus();
    return false;
  }
  /*
  if (document.tmform.m_tel1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('전화번호를 입력해 주세요.');
    document.tmform.m_tel1.focus();
    return false;
  }
  if (document.tmform.m_tel2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('전화번호를 입력해 주세요.');
    document.tmform.m_tel2.focus();
    return false;
  }
  if (document.tmform.m_tel3.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('전화번호를 입력해 주세요.');
    document.tmform.m_tel3.focus();
    return false;
  }
  */
  if (document.tmform.m_handphone1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('핸드폰 번호를 입력해 주세요.');
    document.tmform.m_handphone1.focus();
    return false;
  }
  if (document.tmform.m_handphone2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('핸드폰 번호를 입력해 주세요.');
    document.tmform.m_handphone2.focus();
    return false;
  }
  if (document.tmform.m_handphone3.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert('핸드폰 번호를 입력해 주세요.');
    document.tmform.m_handphone3.focus();
    return false;
  }
  if (actionMode == "join_ok") {
    if (document.tmform.m_post.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('우편번호를 입력해 주세요.');
      document.tmform.m_post.focus();
      return false;
    }
    if (document.tmform.m_address1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('주소를 입력해 주세요.');
      document.tmform.m_address1.focus();
      return false;
    }
    if (document.tmform.m_address2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
      alert('나머지주소를 입력해 주세요.');
      document.tmform.m_address2.focus();
      return false;
    }
  }
  return true;
}

// 주민등록번호 뒷자리로 자동이동
function jumin_focus() {
  if(document.tmform.m_jumin1.value.length >= 6) {
    document.tmform.m_jumin2.focus();
    return false;
  }
}

// 메일 자동체크
function email_change() {
  var email = document.tmform.email_select.value;
  document.tmform.m_email2.value = email;
}

// 아이디 중복체크
function id_check(fboard_root) {
  var m_id = document.tmform.m_id.value;
  if (document.tmform.m_id.value.length < 6) {
    alert("아이디는 6자 이상이어야 합니다.");
    document.tmform.m_id.focus();
    return false;
  }
  window.open(fboard_root+'/fboard/skin/member/member_default1/idCheck.php?m_id='+m_id+'&actionMode=idCheck','idCheck','top=150,left=300,width=428,height=300');
}

// G-PIN 회원가입 완료
function SiteUserConfirm(vidn) {
  wWidth = 350;
  wHight = 120;
  wX = (window.screen.width - wWidth) / 2;
  wY = (window.screen.height - wHight) / 2;

  attr = "GPIN_AQ_SERVICE_SITE_USER_CONFIRM";

  // vidn 값에 vidn + siteuserid 값을 붙여 보낸다.
  requrl = "../g-pin/Sample-SiteUserConfirmRequest.php?Attr="+attr+"&vidn="+vidn;
  var w = window.open(requrl, "_blank", "directories=no,toolbar=no,left="+wX+",top="+wY+",width="+wWidth+",height="+wHight);
}


/////////////////////////////////////////////////////////////////////////////////////
/// 로그인 //////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
function login_gogo() {
  if (document.tmform.m_id.value == false) {
    alert('아이디를 입력해 주세요.');
    document.tmform.m_id.focus();
    return false;
  }
  if (document.tmform.m_password.value == false) {
    alert('비밀번호를 입력해 주세요.');
    document.tmform.m_password.focus();
    return false;
  }
  return true;
}

/////////////////////////////////////////////////////////////////////////////////////
/// 비밀번호 변경 //////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
function pwChange_gogo(){
  if (document.tmform.m_name.value == false) {
    alert('이름을 입력해 주세요.');
    document.tmform.m_name.focus();
    return false;
  }
  if (document.tmform.m_password.value == false) {
    alert('새비밀번호를 입력해 주세요.');
    document.tmform.m_password.focus();
    return false;
  }
  if (document.tmform.m_password2.value == false) {
    alert('새비밀번호 확인을 입력해 주세요.');
    document.tmform.m_password2.focus();
    return false;
  }

  if (document.tmform.m_password.value != document.tmform.m_password2.value) {
    alert("비밀번호가 동일하지 않습니다.");
    document.tmform.m_password.focus();
    return false;
  }
  //var text = "abcd5fg";
  var text = document.tmform.m_password.value;
  var s = (isCase(text));
  var s_1  = s.split("/");
  if(s_1[0]>0)s_1[0] = 1;
  if(s_1[1]>0)s_1[1] = 1;
  if(s_1[2]>0)s_1[2] = 1;
  if(s_1[3]>0)s_1[3] = 1;
  if((parseInt(s_1[0]) + parseInt(s_1[1]) + parseInt(s_1[2]) + parseInt(s_1[3])) < 2){
    alert("비밀번호는 영어대문자(A~Z), 영어소문자(a~z), 숫자(0~9), 특수문자중 2종류 이상으로 작성해 주세요.");
    document.tmform.m_password.focus();
    return false;
  }

  return true;
}


/////////////////////////////////////////////////////////////////////////////////////
/// 아이디,비밀번호 찾기 ////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
function id_search() {
  if (document.tmform.m_name.value == "") {
    alert("이름을 입력해 주세요.");
    document.tmform.m_name.focus();
    return false;
  }
  if (document.tmform.m_email.value == "") {
    alert("이메일주소를 입력해 주세요.");
    document.tmform.m_email.focus();
    return false;
  }
  return true;
}

function pw_search() {
  if (document.tmform.m_name.value == "") {
    alert("이름을 입력해 주세요.");
    document.tmform.m_name.focus();
    return false;
  }
  if (document.tmform.m_id.value == "") {
    alert("아이디를 입력해 주세요.");
    document.tmform.m_id.focus();
    return false;
  }
  if (document.tmform.m_email.value == "") {
    alert("이메일주소를 입력해 주세요.");
    document.tmform.m_email.focus();
    return false;
  }
  if (document.tmform.m_handphone1.value == "") {
    alert("핸드폰번호를 입력해 주세요.");
    document.tmform.m_handphone1.focus();
    return false;
  }
  if (document.tmform.m_handphone2.value == "") {
    alert("핸드폰번호를 입력해 주세요.");
    document.tmform.m_handphone2.focus();
    return false;
  }
  if (document.tmform.m_handphone3.value == "") {
    alert("핸드폰번호를 입력해 주세요.");
    document.tmform.m_handphone3.focus();
    return false;
  }
  /*
  if (document.tmform.m_question.value == "") {
    alert("질문을 선택해 주세요.");
    document.tmform.m_question.focus();
    return false;
  }
  if (document.tmform.m_answer.value == "") {
    alert("답을 입력해 주세요.");
    document.tmform.m_answer.focus();
    return false;
  }
  */
  return true;
}

function pw_search2() {
  if (document.tmform.m_password1.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("비밀번호를 입력해 주세요.");
    document.tmform.m_password1.focus();
    return false;
  }
  if (document.tmform.m_password2.value.replace(/(^\s+)|(\s+$)/g, '') == "") {
    alert("비밀번호를 입력해 주세요.");
    document.tmform.m_password2.focus();
    return false;
  }
  if (document.tmform.m_password1.value.length < 10) {
    alert("비밀번호는 10자 이상이어야 합니다.");
    document.tmform.m_password1.focus();
    return false;
  }
  if (document.tmform.m_password1.value != document.tmform.m_password2.value) {
    alert("비밀번호가 동일하지 않습니다.");
    document.tmform.m_password1.focus();
    return false;
  }
  //var text = "abcd5fg";
  var text = document.tmform.m_password1.value;
  var s = (isCase(text));
  var s_1  = s.split("/");
  if(s_1[0]>0)s_1[0] = 1;
  if(s_1[1]>0)s_1[1] = 1;
  if(s_1[2]>0)s_1[2] = 1;
  if(s_1[3]>0)s_1[3] = 1;
  if((parseInt(s_1[0]) + parseInt(s_1[1]) + parseInt(s_1[2]) + parseInt(s_1[3])) < 2){
    alert("비밀번호는 영어대문자(A~Z), 영어소문자(a~z), 숫자(0~9), 특수문자중 2종류 이상으로 작성해 주세요.");
    document.tmform.m_password1.focus();
    return false;
  }
  return true;
}


/////////////////////////////////////////////////////////////////////////////////////
/// 회원탈퇴 ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
function leave_gogo() {
  if (document.tmform.m_id.value == "") {
    alert("아이디를 입력해 주세요.");
    document.tmform.m_id.focus();
    return false;
  }
  if (document.tmform.m_password.value == "") {
    alert("비밀번호를 입력해 주세요.");
    document.tmform.m_password.focus();
    return false;
  }
  var data = confirm("정말로 회원탈퇴 하겠습니까?")
  if (data) {
	return true;
  } else {
	return false;
  }
  return true;
}