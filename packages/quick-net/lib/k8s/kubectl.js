
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const Client                  = require('kubernetes-client').Client;
const config                  = require('kubernetes-client').config;

const mod                     = ra.modSquad(module, 'kubectl');


mod.async({kapply: async function(argv, context) {
  const deploymentManifest      = nginxDeployment();

  const client      = new Client({config: config.fromKubeconfig(), version: '1.14'});

  const namespaces  = await client.api.v1.namespaces.get();
  sg.elog(`namespaces`, {namespaces});

  const create      = await client.apis.apps.v1.namespaces('default').deployments.post({body: deploymentManifest});
  sg.elog(`create`, {create});

  const deployment  = await client.apis.apps.v1.namespaces('default').deployments(deploymentManifest.metadata.name).get();
  sg.elog(`deployment`, {deployment});

	//
	// Change the Deployment Replica count to 10
	//

	const replica = {
		spec: {
			replicas: 10
		}
	};

	const replicaModify = await client.apis.apps.v1.namespaces('default').deployments(deploymentManifest.metadata.name).patch({ body: replica });
	sg.elog('Replica Modification: ', {replicaModify});

	//
	// Modify the image tag
	//
	const newImage = {
		spec: {
			template: {
				spec: {
					containers: [{
						name: 'nginx',
						image: 'nginx:1.8.1'
					}]
				}
			}
		}
	};
	const imageSet = await client.apis.apps.v1.namespaces('default').deployments(deploymentManifest.metadata.name).patch({ body: newImage });
	sg.elog('New Image: ', {imageSet});

	//
	// Remove the Deployment we created.
	//
	const removed = await client.apis.apps.v1.namespaces('default').deployments(deploymentManifest.metadata.name).delete();
	sg.elog('Removed: ', {removed});

	return replicaModify;
}});


function nginxDeployment() {

  return {
    apiVersion:   'apps/v1',
    kind:         'Deployment',

    metadata: {
      labels: {
        app: 'nginx'
      },
      name: 'nginx-deployment'
    },

    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: 'nginx'
        }
      },

      // The pod template
      template: {
        metadata: {
          labels: {
            app: 'nginx'
          }
        },

        spec: {
          containers: [{
            image:  'nginx:1.7.9',
            name:   'nginx',
            ports: [{
              containerPort: 80
            },{
              containerPort: 443
            }]
          }]
        }
      }
    }
  };
}

