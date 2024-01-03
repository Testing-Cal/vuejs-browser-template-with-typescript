export SKIP_PREFLIGHT_CHECK=true
echo $context
echo $PORT


sed -i  "s/PORT/${PORT}/g" /etc/nginx/conf.d/default.conf
sed -i "s#/context#$context#g" /etc/nginx/conf.d/default.conf

nginx -g "daemon off;"
