
import app
import json  # pragma: no cover
import jwt   # pragma: no cover
from cryptography.hazmat.primitives import serialization # pragma: no cover
from jwt.algorithms import RSAAlgorithm # pragma: no cover

class AppleResolver(object):

    @classmethod
    def __get_right_public_key_info(cls, keys, unverified_header):
        for key in keys:
            if key['kid'] == unverified_header['kid']:
                return key

    @classmethod
    def authenticate(cls, access_token):

        import http.client

        apple_keys_host = 'appleid.apple.com'
        apple_keys_url = '/auth/keys'
        headers = {"Content-type": "application/json"}

        try:

            connection = http.client.HTTPSConnection(apple_keys_host, 443)
            connection.request('GET', apple_keys_url, headers=headers)
            response = connection.getresponse()

            keys_json = json.loads(response.read().decode('utf8'))
            connection.close()

            unverified_header = jwt.get_unverified_header(access_token)

            public_key_info = cls.__get_right_public_key_info(keys_json['keys'], unverified_header)

            apple_public_key = RSAAlgorithm.from_jwk(json.dumps(public_key_info))

            apple_public_key_as_string = apple_public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )

            verified_payload = None
            
            for app_id in app.env['apple_app_ids'].split(','):
                try:
                    verified_payload = jwt.decode(access_token, apple_public_key_as_string, audience=app_id, algorithms=public_key_info['alg'])
                except:
                    pass
            
            if verified_payload is None:
                raise("Invalid Payload")
            
            return {'email': verified_payload['email'], 'id': verified_payload['sub']}

        except Exception as ex:
            raise AuthorizationException(AuthorizationSubcode.InvalidProviderToken) from ex
