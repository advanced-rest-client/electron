# server
openssl req -x509 -newkey rsa:4096 -keyout server_key.pem -out server_cert.pem -nodes -days 1825 -subj "/CN=localhost/O=Client\ Certificate\ Demo"

# Alice
## CSR
openssl req -newkey rsa:4096 -keyout alice_key.pem -out alice_csr.pem -nodes -days 1825 -subj "/CN=Alice"

openssl x509 -req -in alice_csr.pem -CA server_cert.pem -CAkey server_key.pem -out alice_cert.pem -set_serial 01 -days 1825
openssl pkcs12 -export -out alice-password.p12 -inkey alice_key.pem -in alice_cert.pem -passout pass:test
openssl pkcs12 -export -out alice.p12 -inkey alice_key.pem -in alice_cert.pem -passout pass:

# Bob
## CSR
openssl req -newkey rsa:4096 -keyout bob_key.pem -out bob_csr.pem -nodes -days 1825 -subj "/CN=Bob"

openssl x509 -req -in bob_csr.pem -signkey bob_key.pem -out bob_cert.pem -days 1825
openssl pkcs12 -export -out bob.p12 -inkey bob_key.pem -in bob_cert.pem -passout pass:test
