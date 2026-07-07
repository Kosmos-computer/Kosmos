<template>
    <NuxtLayout>
        <NuxtLoadingIndicator />
        <NuxtPage :class="{ 'overflow-hidden': navigationStore.mobileMenuVisible }"/>
    </NuxtLayout>
    <noscript>
      <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=823192439489061&ev=PageView&noscript=1"/>
    </noscript>
</template>
<script setup>
import {useNavigationStore} from "./store/navigation";
import {useMainStore} from "./store/main";
import languageStore from '@/store/LanguageStore';
const { data, status, getCsrfToken, getProviders, signOut } = useSession()
const mainStore = useMainStore();
const route = useRoute()

if (process.client) {
  languageStore.methods.initializeLanguage();
}

const navigationStore = useNavigationStore();
const runtimeConfig = useRuntimeConfig()

if (process.client) {
  if (!window.heap) {
    window.heap=window.heap||[],heap.load=function(e,t){window.heap.appid=e,window.heap.config=t=t||{};var r=document.createElement("script");r.type="text/javascript",r.async=!0,r.src="https://cdn.heapanalytics.com/js/heap-"+e+".js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(r,a);for(var n=function(e){return function(){heap.push([e].concat(Array.prototype.slice.call(arguments,0)))}},p=["addEventProperties","addUserProperties","clearEventProperties","identify","resetIdentity","removeEventProperty","setEventProperties","track","unsetEventProperty"],o=0;o<p.length;o++)heap[p[o]]=n(p[o])};
    heap.load(runtimeConfig.public.heapId);
  }
}

const podiumToken = useCookie('podium_token')
const emailCookie = useCookie('email')

if (route.query && route.query.email) {
  emailCookie.value = route.query.email
}

const email = emailCookie.value

if (((status.value == 'authenticated' && podiumToken.value) || email)  && !mainStore.user) {
  await mainStore.retrieveUser(email)
}

const logoutUser = async () => {
  window.location = '/logout'
}

onBeforeMount(async () => {
  if (route.path != '/logout') {
    if (((status.value == 'authenticated' && podiumToken.value) || email)  && !mainStore.user) {
      await mainStore.retrieveUser(email)
      if (status.value == 'authenticated' && podiumToken.value && !mainStore.user) {
        await logoutUser()
        return
      } 
    }
    
    if ((status.value == 'authenticated' && !podiumToken.value) || (status.value != 'authenticated' && podiumToken.value)) {
      await logoutUser()
      return
    }

    window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: "pvurijy3"
    }

    if (route.path.indexOf('/client-media-editor') == -1) {
      if (mainStore.user) {
        mainStore.initialize()

        window.intercomSettings.name = mainStore.user.name
        window.intercomSettings.email = mainStore.user.email
        window.intercomSettings.user_id = mainStore.user.guid
        window.intercomSettings.guid = mainStore.user.guid
        window.intercomSettings.subscription = mainStore.user.current_subscription_title
        window.intercomSettings.subscription_credits_balance = mainStore.user.current_subscription_credits_balance
        window.intercomSettings.additional_credits_balance = mainStore.user.additional_credits_balance.toFixed(2)
        heap.identify(mainStore.user.email)
        if (mainStore.user.primary_stripe_customer_id) {
          profitwell('start', {'user_id': mainStore.user.primary_stripe_customer_id})
        } else {
          profitwell('start', {})
        }
      } else {
        profitwell('start', {})
      }
    }
  }
})

useHead({
  script: [
    {
      innerHTML: `
      (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/pvurijy3';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
      `,
      type: 'text/javascript',
    },
    {
      src: 'https://r.wdfl.co/rw.js',
      'data-rewardful': '77cb34',
      async: true,
    },
    {
      innerHTML: `
      (function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');
      `,
      type: 'text/javascript',
    },
    {
      innerHTML: `
      (function(i,s,o,g,r,a,m){i[o]=i[o]||function(){(i[o].q=i[o].q||[]).push(arguments)};
        a=s.createElement(g);m=s.getElementsByTagName(g)[0];a.async=1;a.src=r+'?auth='+
        s.getElementById(o+'-js').getAttribute('data-pw-auth');m.parentNode.insertBefore(a,m);
        })(window,document,'profitwell','script','https://public.profitwell.com/js/profitwell.js');
      `,
      type: 'text/javascript',
      id: "profitwell-js",
      'data-pw-auth': "43ee5ad0113a019bd89119654345c3b5"
    },
    {
      innerHTML: `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '823192439489061');
      fbq('track', 'PageView');
      `,
      type: 'text/javascript',
    },
    {
      innerHTML: `
      _linkedin_partner_id = "5421508";
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(_linkedin_partner_id);
      (function(l) {
      if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
      window.lintrk.q=[]}
      var s = document.getElementsByTagName("script")[0];
      var b = document.createElement("script");
      b.type = "text/javascript";b.async = true;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b, s);})(window.lintrk);
      `,
      type: 'text/javascript',
    },
    {
      innerHTML: `
      !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
      },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
      a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
      twq('config','ogpyl');
      `,
      type: 'text/javascript',
    },
    {
      innerHTML: `
      !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};
      p.callQueue=[];
      var t=d.createElement("script");
      t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;
      var s=d.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(t,s)}}(window,document);
      rdt('init','t2_vxderti6', {"optOut":false,"useDecimalCurrencyValues":true,"aaid":"<AAID-HERE>","idfa":"<IDFA-HERE>"});
      rdt('track', 'PageVisit');
      `,
      type: 'text/javascript',
    }
  ]
});
</script>

<style lang="scss">
.v-enter-active,
.v-leave-active {
  transition: opacity 150ms ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.action {
  @apply text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer;
}
</style>
