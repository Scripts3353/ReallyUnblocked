<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suggestions - ReallyUnb0ck3d</title>
<style>
body { font-family: Arial, sans-serif; background:#1e1e2f; color:white; margin:0; padding:20px; }
.container { display:flex; gap:20px; }
form { flex:1; background:#2e2e4f; padding:20px; border-radius:10px; }
form input, form button { display:block; width:100%; margin-bottom:10px; padding:10px; border:none; border-radius:5px; }
form button { background:#4b2e83; color:white; font-weight:bold; cursor:pointer; }
form button:hover { background:#ffcc00; color:#000; }

#suggestionsList { flex:2; background:#2e2e4f; padding:20px; border-radius:10px; max-height:80vh; overflow-y:auto; }
.suggestion { padding:10px; margin-bottom:10px; background:rgba(255,255,255,0.1); border-radius:8px; }
.suggestion strong { color:#b580ff; }
</style>
</head>
<body>

<h1>Suggestions</h1>
<div class="container">
    <!-- Suggestion Form -->
    <form method="POST">
        <h2>Submit a Suggestion</h2>
        <input type="text" name="name" placeholder="Your Name" required>
        <input type="text" name="game" placeholder="Game Name" required>
        <button type="submit">Submit</button>
    </form>

    <!-- Suggestions List -->
    <div id="suggestionsList">
        <h2>Suggestions</h2>
        <?php
        $file = "suggestion.txt";

        // Save new suggestion
        if($_SERVER['REQUEST_METHOD'] === 'POST'){
            $name = htmlspecialchars($_POST['name']);
            $game = htmlspecialchars($_POST['game']);
            $entry = $name . " : " . $game . "\n";
            file_put_contents($file, $entry, FILE_APPEND);
        }

        // Display suggestions
        if(file_exists($file)){
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach($lines as $line){
                $parts = explode(" : ", $line);
                $name = $parts[0];
                $game = $parts[1] ?? '';
                echo "<div class='suggestion'><strong>$name</strong>: $game</div>";
            }
        }
        ?>
    </div>
</div>

</body>
</html>
