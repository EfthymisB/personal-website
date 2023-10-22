<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["message"];

    // Set up the email recipient and subject
    $to = "thymios_mpaira@hotmail.com";
    $subject = "Contact Form Submission from $name";

    // Compose the email message
    $message_body = "Name: $name\n";
    $message_body .= "Email: $email\n";
    $message_body .= "Message:\n$message";

    // Send the email
    mail($to, $subject, $message_body);

    // Redirect the user to a thank you page
    header("Location: thank_you.html");
}
?>
