//import { TNL } from 'tnl-midjourney-api';

const TNL_API_KEY = '4a59484c-51ee-4f26-aefe-91558be8e283';
//const tnl = new TNL(TNL_API_KEY);

class TNLMJ {
  constructor(inputPrompt) 
  {

    this.status = {
      finished: false,
      image: {},
      startTime: new Date(),
      completeTime: "",
      inputPrompt: "",
      progress: 0
    };

    this.inputPrompt = inputPrompt;

    this.callbacks = [];

  }

  // Add a function to add a callback
  addCallback(callback) {
    this.callbacks.push(callback);
  }

  async GetImage() {
    return new Promise((resolve, reject) => {
      console.log(this.inputPrompt);

      const prompt = this.inputPrompt;
      /*const response = await tnl.imagine(prompt);*/

      var axios = require('axios');
      var data = JSON.stringify({
        "msg": prompt,
        "ref": "",
        "webhookOverride": "",
        "ignorePrefilter": "false"
      });

      var config = {
        method: 'post',
        url: 'https://api.thenextleg.io/v2/imagine',
        headers: { 
          'Authorization': 'Bearer '+TNL_API_KEY, 
          'Content-Type': 'application/json'
        },
        data : data
      };

      var currentTime = new Date();
      var timeDifference = currentTime - this.status.startTime; // This will be in milliseconds
      console.log(timeDifference);


      while(this.status.progress < 100 && timeDifference <= 120000) // 120,000 milliseconds = 2 minutes
      {
        currentTime = new Date();
        timeDifference = currentTime - this.status.startTime;
        console.log(timeDifference);

        axios(config)
        .then(function (response) {
          
            console.log(response.data.messageId);

            //
            var axios = require('axios');

            var config = {
              method: 'get',
              url: 'https://api.thenextleg.io/v2/message/'+response.data.messageId,
              headers: { 
                'Authorization': 'Bearer '+TNL_API_KEY, 
              },
              data : data
            };

            axios(config)
            .then(function (response) {
              console.log(JSON.stringify(response.data));
              console.log("response.data.imageUrl: " + response.data.imageUrl);

              this.status.progress = response.data.progress;

              if(this.status.progress == 100)
              {

                this.status.finished = true;
                this.status.image = response.data.messageId;
                this.status.completeTime = new Date();
                this.status.inputPrompt = this.inputPrompt;
                resolve(this.status);

                // Invoke all registered callbacks
                for (const callback of this.callbacks) {
                  try {
                    callback(null, status);
                  } catch (e) {
                    console.error('Error invoking callback:', e);
                  }
                }
              }

            })
            .catch(function (error) {
              console.log(error);
            });

            //


        })
        .catch(function (error) {
          console.log("error1");
        });
      }        


      


    });
  }
}

module.exports = TNLMJ;
