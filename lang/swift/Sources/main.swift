import Kitura

let router = Router()

router.get("/_ah/health") { _, response, next in
    response.send("👌")
    next()
}

Kitura.addHTTPServer(onPort: 8080, with: router)

Kitura.run()
