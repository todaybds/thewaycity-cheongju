export default function handler(req, res) {
  var xff = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  var ip = xff.split(',')[0].trim() || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  var carrier = detectCarrier(ip);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ip: ip, carrier: carrier });
}
function detectCarrier(ip) {
  if (!ip) return '';
  var p = ip.split('.');
  if (p.length !== 4) return '';
  var o12 = p[0] + '.' + p[1];
  var kt = ['118.235','175.223','39.7','1.11','1.16','1.17','27.160','27.161','27.162','27.163','175.252','175.253'];
  if (kt.indexOf(o12) >= 0) return 'KT공용';
  var skt = ['223.38','223.39','223.62','211.36','110.70','203.226','117.111','221.138','221.139','112.149','112.150'];
  if (skt.indexOf(o12) >= 0) return 'SKT공용';
  var lg = ['106.101','106.102','211.234','211.235','211.236','211.246','49.1','49.142','125.176','125.177','125.178','125.179','125.180','125.181','106.240','106.241','106.242','106.243','112.144','112.150','122.35','116.45'];
  if (lg.indexOf(o12) >= 0) return 'LG공용';
  return '';
}
