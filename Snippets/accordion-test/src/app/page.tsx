import * as Accordion from "@/components/accordion-compound-rich";
import AccordionBare from "@/components/accordion";
import { ChevronDown, ArrowInput, ArrowOutput } from "@/components/icon";
import pageStyle from "./page.module.css";

export default function Home() {
  return (
    <>
      <AccordionBare title="This is a Title">
        Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
      </AccordionBare>

      <span style={{ height: "15rem", display: "block" }} />

      <Accordion.Root>
        <Accordion.Header>
          <h6>This is a Title</h6>
          <Accordion.Trigger>
            <ChevronDown className={pageStyle.AccordionRotateIcon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>

      <span style={{ height: "15rem", display: "block" }} />

      <Accordion.Root>
        <Accordion.Header>
          <div>
            <h6>This is a Title</h6>
            <p style={{ opacity: .5 }}>And customized Icon</p>
          </div>
          <Accordion.Trigger>
            <ArrowInput className={pageStyle.IconShowOnUncollapsed} />
            <ArrowOutput className={pageStyle.IconShowOnCollapsed} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>

      <span style={{ height: "15rem", display: "block" }} />

      <Accordion.Root>
        <Accordion.Header>
          <Accordion.Trigger style={{ flex: "1 1" }}>
            <ChevronDown className={pageStyle.AccordionRotateIcon} />
            <h6>Title on the Right</h6>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>

      <span style={{ height: "15rem", display: "block" }} />
      <span style={{ height: "15rem", display: "block" }} />
      <span style={{ height: "15rem", display: "block" }} />

    </>
  );
}

