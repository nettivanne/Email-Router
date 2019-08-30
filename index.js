/*
Name: Email Router
Made by Tino Kaartovuori
Company: Rengas Turku Oy
Version: 1.0.0
Description:
This program receives emails from giosg, modifies email and then sends it
to myynti@rengasturku.com

Goals:
- To add reply -address to emails
- To format email to look better
- To add information about the customer
*/

// Package for sending emails

let nodemailer =  require('nodemailer'); // for sending email
let MailListener = require("mail-listener4");
let fs = require("fs"); // Filesystems

let login_information = require("./login.json"); // Login information

console.log(login_information.user);
console.log(login_information.password);

// Containing HTML -file template
let html_form = fs.readFileSync('./email_template.html');

// Transporter object that connects server to mailer (email sender)
let transporter = nodemailer.createTransport({
  service : 'rengasturku',
  host: 'mail.rengasturku.com',
  secure: 'true',
  post: '465',
  auth : {
    user : login_information.user,
    pass : login_information.password
  }
});


// Function that sends email with options
let sendEmail = function(mailOptions) {

  //  Sending email with the transporter
  transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email sent!");
    }
  });

}

// Setting up mail listener -> waiting for mails
var mailListener = new MailListener({
  username: login_information.user,
  password: login_information.password,
  host: "mail.rengasturku.com",
  port: 993, // imap port
  tls: true,
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX", // mailbox to monitor
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  mailParserOptions: {streamAttachments: true}, // options to be passed to mailParser lib.
  attachments: true, // download attachments as they are encountered to the project directory
  attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
});

mailListener.start(); // start listening

mailListener.on("server:connected", function(){
  console.log("Listening for emails...");
});

mailListener.on("server:disconnected", function(){
  console.log("Server stopped working!");
});

mailListener.on("error", function(err){
  console.log(err);
});

mailListener.on("mail", function(mail, seqno, attributes){

  if (mail.from[0].address != "no-reply@giosg.com") return console.log("Invalid Email.");
  let mail_content = mail.text;
  // Taking the JSON -part out of email for further processing
  let mail_text = ((mail_content).split("<pre>")[1]).split("</pre>")[0];
  let json = JSON.parse(mail_text);

  process_email(json);

});

// Process JSON to create new email out of it
function process_email(json) {

  // Defining variables
  let name = json.data.name;
  let email = json.data.email;
  let vehicle = json.data.field;
  let phone = json.data.phone;
  let message = json.data.message;

  let created = (json.created).split("T")[0] + ", klo " + (json.created).split("T")[1].split(".")[0];
  let last_pages = json.visitor.last_pages;

  let last_pages_list = "";
  for (let page in last_pages) {
    last_pages_list += `<li style="margin: 25px 0;"><a style="color:white;" href="${last_pages[page].action_url}">${last_pages[page].action_title}</a></li>`;
  }

  let html_content = `${html_form}`;
  html_content = html_content.replace("${name}", name);
  html_content = html_content.replace("${email}", email);
  html_content = html_content.replace("${phone}", phone);
  html_content = html_content.replace("${vehicle}", vehicle);
  html_content = html_content.replace("${created}", created);
  html_content = html_content.replace("${message}", message);
  html_content = html_content.replace("${last_pages_list}", last_pages_list);

  let mailOptions = {
    from : 'noreply@rengasturku.com',
    to : "myynti@rengasturku.com",
    replyTo : email,
    subject : 'Uusi yhteydenottopyyntö!',
    html : html_content
  };

  sendEmail(mailOptions);

};
