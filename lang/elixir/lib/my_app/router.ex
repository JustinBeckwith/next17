defmodule MyApp.Router do
  import Plug.Conn

  def init(opts), do: opts

  # configure the health check
  def call(%Plug.Conn{request_path: "/_ah/health"} = conn, _opts) do
    send_resp(conn, 200, "👌")
  end

  
  def call(conn, _opts) do
    send_resp(conn, 200, "<!DOCTYPE html>
<html>
<head>
    <title>Perl on App Engine</title>
    <link rel='stylesheet'' href='style.css'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style type='text/css'>
      html {
        height: 100%;
      }

      body {
        background-color: #db3236;
        color: #fff;
        font-size: 40px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, Helvetica, sans-serif;
      }

      span {
        font-weight: bold;
      }
    </style>
</head>
<body>
  <p>
    Welcome to <span>Elixir</span> on App Engine!
  </p>
</body>
</html>
")
  end
end
