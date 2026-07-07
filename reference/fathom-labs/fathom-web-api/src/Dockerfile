FROM nikolaik/python-nodejs:python3.8-nodejs16

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-key adv --refresh-keys --keyserver keyserver.ubuntu.com
RUN apt-get -y update
RUN apt-get -y install git libpq-dev libmariadb-dev libxmlsec1-dev pandoc

# Install Python dependencies
RUN python -m pip install --upgrade pip
COPY requirements.txt .
RUN python -m pip install -r requirements.txt

# Copy over app code
COPY . .
