FROM php:7.2-apache
COPY --chown=www-data:www-data public_html/index.php /var/www/html/protmap/
COPY --chown=www-data:www-data public_html/viewer.html /var/www/html/protmap/
COPY --chown=www-data:www-data public_html/viewer/* /var/www/html/protmap/viewer/
COPY --chown=www-data:www-data public_html/viewer/js/* /var/www/html/protmap/viewer/js/
COPY --chown=www-data:www-data public_html/viewer/js/vue/* /var/www/html/protmap/viewer/js/vue/
COPY --chown=www-data:www-data public_html/viewer/js/axios/* /var/www/html/protmap/viewer/js/axios/
COPY --chown=www-data:www-data public_html/viewer/img/* /var/www/html/protmap/viewer/img/
COPY --chown=www-data:www-data public_html/viewer/css/* /var/www/html/protmap/viewer/css/
COPY --chown=www-data:www-data public_html/data/* /var/www/html/protmap/data/
COPY --chown=www-data:www-data public_html/results/* /var/www/html/protmap/results/

