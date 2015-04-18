## IP addresses (example)

### frontend

    10.2.204.42
    
### backend

    10.2.204.37
    10.2.204.40
    10.2.204.41
    10.2.204.30


    
    
## Frontend

### Setup

	vi ~/.ssh/authorized_keys
	add keys
	sudo service ssh restart
	
	sudo apt-get update
	sudo apt-get -y upgrade
	sudo apt-get -y install git etckeeper nginx redis-server dsh
	
	sudo vi /etc/nginx/nginx.conf


add before site includes

    upstream chat_backend {
            ip_hash;
            server 10.2.204.37:8081;
            server 10.2.204.40:8081;
            server 10.2.204.41:8081;
            server 10.2.204.30:8081;
    }

    map $http_upgrade $connection_upgrade {
            default upgrade;
            '' close;
    }

Edit default site configuration
        
	sudo vi /etc/nginx/sites-available/default

add to the server section - remove the original one, comment out root and index too

    location / {
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_pass http://chat_backend;
    }
        
restart nginx

	sudo service nginx restart

	sudo vi /etc/redis/redis.conf
	#change bind attribute to accept remote connections
	bind 0.0.0.0

	sudo service redis-server restart

	sudo vi /etc/dsh/dsh.conf
	#change remoteshell =ssh
	sudo vi /etc/dsh/machines.list
	# add all backend servers to the list
	10.2.204.37
	10.2.204.40
	10.2.204.41
	10.2.204.30
	
	# to test the set up
	dsh -a -M -c uptime

### Updating backend servers from the front end

	dsh -a -M -c "cd ~/ngChat; git pull; npm install"
	dsh -a -M -c "cd ~/ngChat; DEBUG=ngChat* REDIS_HOST=10.2.204.42 node app.js"

## Backend

### Setup

	vi ~/.ssh/authorized_keys
	add keys
	sudo service ssh restart
	
	sudo apt-get update
	sudo apt-get -y upgrade
	sudo apt-get -y install git etckeeper 
	curl -sL https://deb.nodesource.com/setup | sudo bash -
	sudo apt-get install -y nodejs
	git clone https://github.com/pmeijer/ngChat.git
	cd ngChat/
	npm install
	DEBUG=ngChat* REDIS_HOST=10.2.204.42 node app.js



