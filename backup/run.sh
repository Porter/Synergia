shopt -s extglob
rm -rf backup
mkdir backup
cp -r !(backup|node_modules) backup/
sudo node server.js email=$my_email password=$my_password
