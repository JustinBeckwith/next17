# You can run that on App Engine!?
This is the source code for my GCP Next 2017 talk.

[![You can run that on App Engine!?](https://i.imgur.com/r0SCp8S.jpg)](https://www.youtube.com/watch?v=sATG0OfdP4g)

## Setting up
If you want to run this code yourself, you're gonna need to do a few things.

### cherries
This is a sample app that shows up the traffic splitting features of App Engine.  You will need to:

- Rename `example.secrets.json` to `secrets.json`
- Go get yourself some redis.  I used RedisLabs.  You can follow the [directions here](https://cloud.google.com/nodejs/resources/databases/redis#using_redis_labs).
- Copy the host, port, and password for your redis server into `secrets.json`.
- Go get yourself some pubnub.  You can learn how to get a pubnub account and how to create a pubsub channel [here](https://www.pubnub.com/docs/getting-started-guides/pubnub-publish-subscribe).
- Copy the pubnub keys into `secrets.json`.

### lang
This is a demo of using various fun languages with App Engine, largely by stuffing things into a Docker container.

You pretty much just need to have docker installed.


## License
[MIT License](LICENSE.md)

## Questions?
Feel free to submit an issue on the repository, or find me at [@JustinBeckwith](http://twitter.com/JustinBeckwith) if you have any questions 🙃
