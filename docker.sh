docker build -t whispergrid .

docker run -d -p 3000:3000 -v $(pwd)/data:/data whispergrid