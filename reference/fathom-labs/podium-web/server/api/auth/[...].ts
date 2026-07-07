// file: ~/server/api/auth/[...].ts
import { gql } from "@apollo/client/core"
import { ApolloClient, InMemoryCache} from "@apollo/client"
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { NuxtAuthHandler } from '#auth'

const apolloClient = new ApolloClient({
  uri: process.env.FATHOM_WEB_API_URL + '/graphql',
  cache: new InMemoryCache()
});

const podiumSignIn = gql`
mutation podiumSignIn($email: String, $password: String, $alternateEmail: String, $socialProvider: String, $socialAccessToken: String) {
  podiumSignIn(podiumUser: {
      email: $email,
      password: $password,
      alternateEmail: $alternateEmail,
      socialProvider: $socialProvider,
      socialAccessToken: $socialAccessToken
    }) {
      podiumUser {
        guid,
        name,
        email,
        profileImageUrl,
        podiumToken,
        newUserInfoComplete
      }
    }
  }
`;

export default NuxtAuthHandler({
  secret: process.env.NUXT_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 180 * 24 * 60 * 60,
  },
  pages: {
    // Change the default behavior to use `/login` as the path for the sign-in page
    signIn: '/login'
  },
  callbacks: {
    async jwt ({ token, account, user }) {
      
      if (account && account.provider != 'credentials') {
        try {
          
          const result = await apolloClient.mutate({
            mutation: podiumSignIn,
            variables: {
              socialProvider: account.provider,
              socialAccessToken: account.access_token
            }
          })

          if (result && result.data.podiumSignIn.podiumUser && result.data.podiumSignIn.podiumUser.podiumToken) {
            const podiumUser = result.data.podiumSignIn.podiumUser;
            token.accessToken = podiumUser.podiumToken;
          }

        } catch (error) {
          return null
        }
      } else if (user) {
        token.accessToken = user.accessToken
      }

      return token
    },
    async session({ session, token, user }) {
      return session
    }
  },
  providers: [
      // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
      //TwitterProvider.default({
      //  clientId: process.env.TWITTER_CLIENT_ID,
      //  clientSecret: process.env.TWITTER_CLIENT_SECRET
      //}),
      GoogleProvider.default({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      }),
      CredentialsProvider.default({
        // The name to display on the sign in form (e.g. 'Sign in with...')
        name: 'Credentials',
        // The credentials is used to generate a suitable form on the sign in page.
        // You can specify whatever fields you are expecting to be submitted.
        // e.g. domain, username, password, 2FA token, etc.
        // You can pass any HTML attribute to the <input> tag through the object.
        credentials: {
          username: { label: "Email", type: "text", placeholder: "email" },
          password: {  label: "Password", type: "password" }
        },
        async authorize(credentials: any) {
          console.log('credentials', credentials)
          
          try {
            const result = await apolloClient.mutate({
              mutation: podiumSignIn,
              variables: {
                email: credentials.email,
                password: credentials.password,
              }
            })

            if (result && result.data.podiumSignIn.podiumUser && result.data.podiumSignIn.podiumUser.podiumToken) {
              const podiumUser = result.data.podiumSignIn.podiumUser
              
              const user = { 
                name: podiumUser.name,
                email: podiumUser.email,
                image: podiumUser.profileImageUrl,
                accessToken: podiumUser.podiumToken,
              }
              
              return user
            }

          } catch (error) {
            console.log('error', error);
            return false
          }
          //return user
          return false
        }
      })
  ]
})
