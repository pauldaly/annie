## What is Annie
Annie is a framework to build enterprise applications. Annie is the code name for the client side component. 

Annie is a new way to build enterprise applications. Annie is designed to work with the backend out of the gate. All UI applications connect to server side code (PHP, Java, C#, etc.) which in turn stores data somewhere (MSSQL, MySQL, Oracle, NoSQL, Hadoop, etc.)

Annie was built to address what I found lacking in other development tools. Building an enterprise application entails things like:
- rendering context dynamically
- creating forms to capture data
- api calls for CRUD functions
- manipulating data client side
- initialize form fields and dom elements
- route across pages for a MPA or views for a SPA

Angular, React, Svelte and other don't remove the need to code reactively. They just force you to use their own opinionated way to make elements reactive. Annie is not opinionated. Use the features. Don't use the features. We don't care. Write your own code for something you need to do differently or doesn't exist.

Microsoft WebForms used a &lt;form&gt; element to contain the entire page. Annie allows any element to be a form that can be sent to the server. You can use multiple forms and embed forms within forms. Why is this of any value? This gives you control over exactly what you send to the server.

Annie automatically "packages" any data you want to send to the server to minimize coding and mistakes. As a comparison, we will show what is necessary to submit data using React and Angular as opposed to Annie.

For the form:<br/>
<code>
&lt;form id="form1">
</code><br/>
<code>
  First name &lt;input type="input" name="firstname"/&gt;
</code><br/>
<code>
  Last name &lt;input type="input" name="lastname"&gt;<br/>
</code><br/>
<code>
&lt;/form&gt;
</code><br/>

<h3>Annie</h3>
<code>
  &lt;div data-trigger_='[{"type":"xhr","form":["form1"],"query":["update-query-name"]'&gt;<br/>
    Submit Form<br/>
  &lt;/div&gt;
</code><br/>

<h3>Yes, that's it. We assume you want to submit data so why make you write code to do the same thing over and over again.</h3>

<h3>React</h3>
<code>
&lt;!-- Oh, right. React doesn't handle API calls --&gt;
</code>

<h3>Angular</h3>
File #1<br/>

<code>
import { NgModule } from '@angular/core';
</code><br/>
<code>
import { BrowserModule } from '@angular/platform-browser';
</code><br/>
<code>
import { HttpClientModule } from '@angular/common/http';
</code><br/>
<code>
@NgModule({
</code><br/>
<code>
  imports: [
</code><br/>
<code>
    BrowserModule,
</code><br/>
<code>
    // import HttpClientModule after BrowserModule.
</code><br/>
<code>
    HttpClientModule,
</code><br/>
<code>
  ],
</code><br/>
<code>
  declarations: [
</code><br/>
<code>
    AppComponent,
</code><br/>
<code>
  ],
</code><br/>
<code>
  bootstrap: [ AppComponent ]
</code><br/>
<code>
})
</code><br/>
<code>
export class AppModule {}
</code><br/>

File #2<br/>
<code>
import { Injectable } from '@angular/core';
</code><br/>
<code>
import { HttpClient } from '@angular/common/http';
</code><br/>
<code>
@Injectable()
</code><br/>
<code>
export class ConfigService {
</code><br/>
<code>
  constructor(private http: HttpClient) { }
</code><br/>
<code>
}
</code><br/>

<h3>I'm sorry. There is just too much more code before we even make a call using Angular.</h3>



## Supporting Annie

Annie is an MIT-licensed open source project with its ongoing development made possible entirely by crazy people who think they can offer something better than the likes of Google and Facebook. If you'd like to support them, please consider:

- [Becoming a backer on Open Collective](https://opencollective.com/[coming-soon]).

Funds donated via Open Collective will be used for compensating expenses related to Annie's development such as hosting costs. If sufficient donations are received, funds may also be used to support Annie's development more directly.


## Development

coming soon

To install and work on Annie locally:

coming soon


## License

[MIT](LICENSE.md)
