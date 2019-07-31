

cd .\lib\k8s\tiers\apps\check-cluster\
docker build -t quicknet-k8s-check-cluster .
docker tag quicknet-k8s-check-cluster:latest briancsparks/quicknet-k8s-check-cluster:latest
docker push briancsparks/quicknet-k8s-check-cluster:latest

cd ../../../../..
# kubectl apply -k lib/k8s/config/overlays/development/ --record
