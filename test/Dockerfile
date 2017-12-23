FROM node:8

RUN useradd --user-group --create-home --shell /bin/false app
ENV HOME=/home/app
WORKDIR $HOME/src

COPY .babelrc .eslintrc.json package.json package-lock.json ./
RUN npm install
COPY ./src ./src
COPY ./test ./test

CMD npm test