FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY dist .
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 4001

CMD ["nginx", "-g", "daemon off;"]
