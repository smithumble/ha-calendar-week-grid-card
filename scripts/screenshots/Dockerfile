FROM timbru31/node-chrome:24-alpine

RUN apk add --no-cache font-noto font-noto-emoji ttf-dejavu ttf-liberation fontconfig curl && \
    mkdir -p /usr/share/fonts/truetype/google-sans /usr/share/fonts/truetype/roboto && \
    curl -fsSL "https://fonts.gstatic.com/s/googlesans/v67/4Ua_rENHsxJlGDuGo1OIlJfC6l_24rlCK1Yo_Iqcsih3SAyH6cAwhX9RFD48TE63OOYKtrwEIKli.ttf" \
      -o /usr/share/fonts/truetype/google-sans/GoogleSans-Regular.ttf && \
    curl -fsSL "https://fonts.gstatic.com/s/googlesans/v67/4Ua_rENHsxJlGDuGo1OIlJfC6l_24rlCK1Yo_Iqcsih3SAyH6cAwhX9RFD48TE63OOYKtrw2IKli.ttf" \
      -o /usr/share/fonts/truetype/google-sans/GoogleSans-Medium.ttf && \
    curl -fsSL "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf" \
      -o /usr/share/fonts/truetype/roboto/Roboto-Regular.ttf && \
    curl -fsSL "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWub2bWmT.ttf" \
      -o /usr/share/fonts/truetype/roboto/Roboto-Medium.ttf && \
    fc-cache -f
