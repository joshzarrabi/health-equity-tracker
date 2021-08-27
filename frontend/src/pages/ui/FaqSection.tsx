import React from "react";
import styles from "./FaqSection.module.scss";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { Accordion, AccordionSummary } from "@material-ui/core";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import {
  TAB_PARAM,
  WHAT_IS_HEALTH_EQUITY_PAGE_LINK,
  ReactRouterLinkButton,
} from "../../utils/urlutils";
import { WIHE_FAQ_TAB_INDEX } from "../WhatIsHealthEquity/WhatIsHealthEquityPage";
import { selectFaqs } from "../WhatIsHealthEquity/FaqTab";
import parse from "html-react-parser";

function Question(props: {
  questionText: string;
  ariaControls: string;
  id: string;
  answer: JSX.Element;
}) {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={props.ariaControls}
        id={props.id}
      >
        <Typography className={styles.FaqQuestion} variant="h2">
          {props.questionText}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <div className={styles.FaqAnswer}>{props.answer}</div>
      </AccordionDetails>
    </Accordion>
  );
}

function FaqSection() {
  return (
    <Grid container className={styles.FaqRow}>
      <Grid item xs={12}>
        <Typography className={styles.FaqHeader} variant="h1">
          Frequently asked questions
        </Typography>
      </Grid>
      <Grid item xs={12} className={styles.FaqQAItem}>
        {selectFaqs.map((faq, index) => {
          return (
            <Question
              key={faq.q}
              questionText={faq.q}
              ariaControls={`panel${index + 1}-content`}
              id={`panel${index + 1}-header`}
              answer={<>{parse(faq.a)}</>}
            />
          );
        })}
      </Grid>
      <Grid item>
        <ReactRouterLinkButton
          url={`${WHAT_IS_HEALTH_EQUITY_PAGE_LINK}?${TAB_PARAM}=${WIHE_FAQ_TAB_INDEX}`}
          className={styles.FaqLink}
          displayName="See our full FAQ page"
        />
      </Grid>
    </Grid>
  );
}

export default FaqSection;
